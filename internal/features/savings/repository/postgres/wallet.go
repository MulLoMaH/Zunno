package savings_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

// getOrCreateSystemCategory — возвращает ID категории "Копилка" для группы,
// создавая её при первом обращении. Нужна, потому что transactions.category_id NOT NULL.
func (r *SavingsRepository) getOrCreateSystemCategory(ctx context.Context, groupID uuid.UUID) (uuid.UUID, error) {
	var catID uuid.UUID
	err := r.pool.QueryRow(ctx,
		`SELECT id FROM zunno.categories WHERE group_id = $1 AND name = 'Копилка' LIMIT 1`,
		groupID,
	).Scan(&catID)
	if err == nil {
		return catID, nil
	}
	if !errors.Is(err, core_postgres_pool.ErrNoRows) {
		return uuid.Nil, fmt.Errorf("get system category: %w", err)
	}
	err = r.pool.QueryRow(ctx,
		`INSERT INTO zunno.categories (group_id, name, type, budget_limit)
		 VALUES ($1, 'Копилка', 'fixed', 0) RETURNING id`,
		groupID,
	).Scan(&catID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("create system category: %w", err)
	}
	return catID, nil
}

func (r *SavingsRepository) GetWalletBalance(ctx context.Context, groupID uuid.UUID) (domain.WalletBalance, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	// Считаем суммы по типам транзакций
	query := `
		SELECT
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
			COALESCE(SUM(CASE WHEN type = 'savings_deposit' THEN amount ELSE 0 END), 0) as transfers_to,
			COALESCE(SUM(CASE WHEN type = 'savings_withdraw' THEN amount ELSE 0 END), 0) as transfers_from
		FROM zunno.transactions
		WHERE group_id = $1
	`
	var income, expense, toSavings, fromSavings float64
	err := r.pool.QueryRow(ctx, query, groupID).Scan(&income, &expense, &toSavings, &fromSavings)
	if err != nil {
		return domain.WalletBalance{}, fmt.Errorf("calc wallet balance: %w", err)
	}

	// Считаем общую сумму в копилках
	var totalInSavings float64
	err = r.pool.QueryRow(ctx, `SELECT COALESCE(SUM(current_amount), 0) FROM zunno.savings_goals WHERE group_id = $1 AND is_archived = FALSE`, groupID).Scan(&totalInSavings)
	if err != nil {
		return domain.WalletBalance{}, fmt.Errorf("calc total in savings: %w", err)
	}

	// Кошелёк = (Доходы - Расходы) - Отложено + Снято
	balance := (income - expense) - toSavings + fromSavings

	return domain.WalletBalance{
		GroupID:        groupID,
		Balance:        balance,
		TotalIncome:    income,
		TotalExpense:   expense,
		TotalInSavings: totalInSavings,
		TransfersTo:    toSavings,
		TransfersFrom:  fromSavings,
	}, nil
}

// CreateTransferTransaction — создаёт транзакцию перевода (для истории).
// Вызывается внутри транзакции БД (например, при пополнении копилки).
func (r *SavingsRepository) CreateTransferTransaction(ctx context.Context, tx domain.Transaction, goalID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	// 1. Находим или создаём системную категорию "Копилка"
	var catID uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT id FROM zunno.categories WHERE group_id = $1 AND name = 'Копилка' LIMIT 1`, tx.GroupID).Scan(&catID)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			err = r.pool.QueryRow(ctx, `INSERT INTO zunno.categories (group_id, name, type, budget_limit) VALUES ($1, 'Копилка', 'fixed', 0) RETURNING id`, tx.GroupID).Scan(&catID)
			if err != nil {
				return fmt.Errorf("create system category: %w", err)
			}
		} else {
			return fmt.Errorf("get system category: %w", err)
		}
	}

	// 2. Записываем транзакцию с найденной категорией
	query := `
		INSERT INTO zunno.transactions (group_id, user_id, category_id, amount, date, description, type, savings_goal_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err = r.pool.Exec(ctx, query,
		tx.GroupID, tx.UserID, catID, tx.Amount, tx.Date, tx.Description, tx.Type, goalID,
	)
	if err != nil {
		return fmt.Errorf("create transfer tx: %w", err)
	}
	return nil
}

// TransferAtomic — атомарно: обновить копилку + создать транзакцию + вернуть новый баланс.
// Всё в одной DB-транзакции: если что-то падает — полный откат.
func (r *SavingsRepository) TransferAtomic(
	ctx context.Context,
	groupID, userID, goalID uuid.UUID,
	amount float64,
	isDeposit bool,
	goalName string,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 0. Блокируем все переводы для этой группы (Advisory Lock).
	// Это защищает от одновременных переводов (race condition),
	// чтобы баланс кошелька не ушел в минус.
	_, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, groupID.String())
	if err != nil {
		return fmt.Errorf("acquire lock: %w", err)
	}

	// 1. Лочим копилку (SELECT FOR UPDATE)
	var currentAmount float64
	err = tx.QueryRow(ctx, `SELECT current_amount FROM zunno.savings_goals WHERE id = $1 FOR UPDATE`, goalID).Scan(&currentAmount)
	if err != nil {
		return fmt.Errorf("lock goal: %w", err)
	}

	var newAmount float64
	var txType string
	if isDeposit {
		newAmount = currentAmount + amount
		txType = "savings_deposit"
	} else {
		newAmount = currentAmount - amount
		if newAmount < 0 {
			return fmt.Errorf("insufficient funds in savings: %w", core_errors.ErrInvalidArgument)
		}
		txType = "savings_withdraw"
	}

	// 2. Обновляем копилку
	_, err = tx.Exec(ctx, `
		UPDATE zunno.savings_goals
		SET current_amount = $1, version = version + 1, updated_at = NOW()
		WHERE id = $2
	`, newAmount, goalID)
	if err != nil {
		return fmt.Errorf("update goal: %w", err)
	}

	// 3. Получаем (или создаём) системную категорию "Копилка"
	catID, err := r.getOrCreateSystemCategory(ctx, groupID)
	if err != nil {
		return fmt.Errorf("get category: %w", err)
	}

	// 4. Пишем транзакцию
	descPrefix := "В копилку"
	if !isDeposit {
		descPrefix = "Из копилки"
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO zunno.transactions (group_id, user_id, category_id, amount, date, description, type, savings_goal_id)
		VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)
	`, groupID, userID, catID, amount, fmt.Sprintf("%s: %s", descPrefix, goalName), txType, goalID)
	if err != nil {
		return fmt.Errorf("create tx: %w", err)
	}

	return tx.Commit(ctx)
}
