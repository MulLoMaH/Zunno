package budget_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

func (r *BudgetRepository) CreateTransaction(
	ctx context.Context,
	t domain.Transaction,
) (domain.Transaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.transactions (group_id, user_id, category_id, amount, date, description)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, version, group_id, user_id, category_id, amount, date, description, created_at
	`
	var m TransactionModel
	err := r.pool.QueryRow(ctx, query,
		t.GroupID, t.UserID, t.CategoryID, t.Amount, t.Date, t.Description,
	).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.UserID, &m.CategoryID,
		&m.Amount, &m.Date, &m.Description, &m.CreatedAt,
	)
	if err != nil {
		return domain.Transaction{}, fmt.Errorf("create transaction: %w", err)
	}
	return transactionFromModel(m), nil
}

type TransactionsFilter struct {
	GroupID    uuid.UUID
	From       *time.Time
	To         *time.Time
	CategoryID *uuid.UUID
	UserID     *uuid.UUID
	Limit      int
	Offset     int
}

func (r *BudgetRepository) GetTransactions(
	ctx context.Context,
	f TransactionsFilter,
) ([]domain.Transaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	var sb strings.Builder
	args := []any{f.GroupID}
	sb.WriteString(`
		SELECT id, version, group_id, user_id, category_id, amount, date, description, created_at
		FROM zunno.transactions
		WHERE group_id = $1
	`)

	idx := 2
	if f.From != nil {
		sb.WriteString(fmt.Sprintf(" AND date >= $%d", idx))
		args = append(args, *f.From)
		idx++
	}
	if f.To != nil {
		sb.WriteString(fmt.Sprintf(" AND date <= $%d", idx))
		args = append(args, *f.To)
		idx++
	}
	if f.CategoryID != nil {
		sb.WriteString(fmt.Sprintf(" AND category_id = $%d", idx))
		args = append(args, *f.CategoryID)
		idx++
	}
	if f.UserID != nil {
		sb.WriteString(fmt.Sprintf(" AND user_id = $%d", idx))
		args = append(args, *f.UserID)
		idx++
	}

	sb.WriteString(" ORDER BY date DESC")

	if f.Limit > 0 {
		sb.WriteString(fmt.Sprintf(" LIMIT $%d", idx))
		args = append(args, f.Limit)
		idx++
	}
	if f.Offset > 0 {
		sb.WriteString(fmt.Sprintf(" OFFSET $%d", idx))
		args = append(args, f.Offset)
	}

	rows, err := r.pool.Query(ctx, sb.String(), args...)
	if err != nil {
		return nil, fmt.Errorf("query transactions: %w", err)
	}
	defer rows.Close()

	var txs []domain.Transaction
	for rows.Next() {
		var m TransactionModel
		if err := rows.Scan(
			&m.ID, &m.Version, &m.GroupID, &m.UserID, &m.CategoryID,
			&m.Amount, &m.Date, &m.Description, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		txs = append(txs, transactionFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate transactions: %w", err)
	}
	return txs, nil
}

// GetCategorySpent — сколько потрачено в категории за период [from, to)
func (r *BudgetRepository) GetCategorySpent(
	ctx context.Context,
	categoryID uuid.UUID,
	from, to time.Time,
) (float64, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT COALESCE(SUM(amount), 0)
		FROM zunno.transactions
		WHERE category_id = $1 AND date >= $2 AND date < $3
	`
	var total float64
	err := r.pool.QueryRow(ctx, query, categoryID, from, to).Scan(&total)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("sum spent: %w", err)
	}
	return total, nil
}
