package recurring_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

func (r *RecurringRepository) CreateRecurring(ctx context.Context, rt domain.RecurringTransaction) (domain.RecurringTransaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.recurring_transactions
		    (group_id, user_id, category_id, title, type, amount, day_of_month, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, group_id, user_id, category_id, title, type, amount,
		          day_of_month, is_active, last_processed_at, created_at, updated_at
	`
	var m RecurringModel
	err := r.pool.QueryRow(ctx, query,
		rt.GroupID, rt.UserID, rt.CategoryID, rt.Title, rt.Type, rt.Amount, rt.DayOfMonth, rt.IsActive,
	).Scan(
		&m.ID, &m.GroupID, &m.UserID, &m.CategoryID, &m.Title, &m.Type, &m.Amount,
		&m.DayOfMonth, &m.IsActive, &m.LastProcessedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return domain.RecurringTransaction{}, fmt.Errorf("create recurring: %w", err)
	}
	return recurringFromModel(m), nil
}

func (r *RecurringRepository) GetRecurring(ctx context.Context, id uuid.UUID) (domain.RecurringTransaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, group_id, user_id, category_id, title, type, amount,
		       day_of_month, is_active, last_processed_at, created_at, updated_at
		FROM zunno.recurring_transactions
		WHERE id = $1
	`
	var m RecurringModel
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.GroupID, &m.UserID, &m.CategoryID, &m.Title, &m.Type, &m.Amount,
		&m.DayOfMonth, &m.IsActive, &m.LastProcessedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.RecurringTransaction{}, core_errors.ErrRecurringNotFound
		}
		return domain.RecurringTransaction{}, fmt.Errorf("get recurring: %w", err)
	}
	return recurringFromModel(m), nil
}

func (r *RecurringRepository) ListRecurrings(ctx context.Context, groupID uuid.UUID) ([]domain.RecurringTransaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, group_id, user_id, category_id, title, type, amount,
		       day_of_month, is_active, last_processed_at, created_at, updated_at
		FROM zunno.recurring_transactions
		WHERE group_id = $1
		ORDER BY day_of_month ASC, created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("list recurrings: %w", err)
	}
	defer rows.Close()

	var result []domain.RecurringTransaction
	for rows.Next() {
		var m RecurringModel
		if err := rows.Scan(
			&m.ID, &m.GroupID, &m.UserID, &m.CategoryID, &m.Title, &m.Type, &m.Amount,
			&m.DayOfMonth, &m.IsActive, &m.LastProcessedAt, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan recurring: %w", err)
		}
		result = append(result, recurringFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recurrings: %w", err)
	}
	return result, nil
}

func (r *RecurringRepository) UpdateRecurring(ctx context.Context, id uuid.UUID, rt domain.RecurringTransaction) (domain.RecurringTransaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.recurring_transactions
		SET category_id  = $1,
		    title        = $2,
		    type         = $3,
		    amount       = $4,
		    day_of_month = $5,
		    is_active    = $6,
		    last_processed_at = CASE WHEN day_of_month != $5 THEN NULL ELSE last_processed_at END,
		    updated_at   = NOW()
		WHERE id = $7
		RETURNING id, group_id, user_id, category_id, title, type, amount,
		          day_of_month, is_active, last_processed_at, created_at, updated_at
	`
	var m RecurringModel
	err := r.pool.QueryRow(ctx, query,
		rt.CategoryID, rt.Title, rt.Type, rt.Amount, rt.DayOfMonth, rt.IsActive, id,
	).Scan(
		&m.ID, &m.GroupID, &m.UserID, &m.CategoryID, &m.Title, &m.Type, &m.Amount,
		&m.DayOfMonth, &m.IsActive, &m.LastProcessedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.RecurringTransaction{}, core_errors.ErrRecurringNotFound
		}
		return domain.RecurringTransaction{}, fmt.Errorf("update recurring: %w", err)
	}
	return recurringFromModel(m), nil
}

func (r *RecurringRepository) DeleteRecurring(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.recurring_transactions WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete recurring: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrRecurringNotFound
	}
	return nil
}

// ListPendingForDay — для фонового воркера: ищет активные шаблоны, у которых day_of_month = сегодня
func (r *RecurringRepository) ListPendingForMonth(ctx context.Context, day int, daysInMonth int, monthStart time.Time) ([]domain.RecurringTransaction, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, group_id, user_id, category_id, title, type, amount,
		       day_of_month, is_active, last_processed_at, created_at, updated_at
		FROM zunno.recurring_transactions
		WHERE day_of_month <= $1
		  AND is_active = TRUE
		  AND (last_processed_at IS NULL OR last_processed_at < $2)
	`
	rows, err := r.pool.Query(ctx, query, day, monthStart)
	if err != nil {
		return nil, fmt.Errorf("list pending recurrings: %w", err)
	}
	defer rows.Close()

	var result []domain.RecurringTransaction
	for rows.Next() {
		var m RecurringModel
		if err := rows.Scan(
			&m.ID, &m.GroupID, &m.UserID, &m.CategoryID, &m.Title, &m.Type, &m.Amount,
			&m.DayOfMonth, &m.IsActive, &m.LastProcessedAt, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan pending recurring: %w", err)
		}
		result = append(result, recurringFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending recurrings: %w", err)
	}
	return result, nil
}

// MarkProcessed — обновляет время последнего выполнения шаблона (для совместимости)
func (r *RecurringRepository) MarkProcessed(ctx context.Context, id uuid.UUID, processedAt time.Time) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.recurring_transactions SET last_processed_at = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, processedAt, id)
	if err != nil {
		return fmt.Errorf("mark processed: %w", err)
	}
	return nil
}

// MarkProcessedAtomic — атомарно ставит метку, только если шаблон ещё не обработан в этом месяце.
// Возвращает true, если метка успешно установлена нами (тогда нужно создавать транзакцию).
func (r *RecurringRepository) MarkProcessedAtomic(
	ctx context.Context,
	id uuid.UUID,
	monthStart, processedAt time.Time,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.recurring_transactions
		SET last_processed_at = $1
		WHERE id = $2
		  AND (last_processed_at IS NULL OR last_processed_at < $3)
	`
	tag, err := r.pool.Exec(ctx, query, processedAt, id, monthStart)
	if err != nil {
		return false, fmt.Errorf("mark processed atomic: %w", err)
	}
	return tag.RowsAffected() == 1, nil
}

// UnmarkProcessed — откат метки (если не удалось создать транзакцию).
func (r *RecurringRepository) UnmarkProcessed(ctx context.Context, id uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.recurring_transactions SET last_processed_at = NULL WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("unmark processed: %w", err)
	}
	return nil
}
