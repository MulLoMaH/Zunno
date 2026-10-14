package budget_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_kafka "github.com/MulLoMaH/Zunno/internal/core/kafka"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

// UpsertCategoryStats — вызывается из консьюмера.
// Атомарно добавляет amount к total_amount за нужный месяц.
func (r *BudgetRepository) UpsertCategoryStats(
	ctx context.Context,
	evt core_kafka.TransactionCreatedEvent,
	month string,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.category_stats (group_id, user_id, category_id, month, total_amount, updated_at)
		VALUES ($1, $2, $3, $4, $5, now())
		ON CONFLICT (group_id, user_id, category_id, month)
		DO UPDATE SET
		    total_amount = zunno.category_stats.total_amount + EXCLUDED.total_amount,
		    updated_at   = now(),
		    version      = zunno.category_stats.version + 1
	`
	_, err := r.pool.Exec(ctx, query,
		evt.GroupID, evt.UserID, evt.CategoryID, month, evt.Amount,
	)
	if err != nil {
		return fmt.Errorf("upsert category stats: %w", err)
	}
	return nil
}

func (r *BudgetRepository) GetCategoryStats(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
	userID *uuid.UUID,
) ([]domain.CategoryStats, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	var (
		query string
		args  []any
	)
	if userID != nil {
		query = `
			SELECT version, group_id, user_id, category_id, month, total_amount, updated_at
			FROM zunno.category_stats
			WHERE group_id = $1 AND month = $2 AND user_id = $3
		`
		args = []any{groupID, month, *userID}
	} else {
		query = `
			SELECT version, group_id, user_id, category_id, month, total_amount, updated_at
			FROM zunno.category_stats
			WHERE group_id = $1 AND month = $2
		`
		args = []any{groupID, month}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query category stats: %w", err)
	}
	defer rows.Close()

	var out []domain.CategoryStats
	for rows.Next() {
		var s domain.CategoryStats
		if err := rows.Scan(
			&s.Version, &s.GroupID, &s.UserID, &s.CategoryID,
			&s.Month, &s.TotalAmount, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan stats: %w", err)
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stats: %w", err)
	}
	return out, nil
}

// StatsExist — есть ли хоть одна запись за месяц (для polling).
func (r *BudgetRepository) StatsExist(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT EXISTS (
		    SELECT 1 FROM zunno.category_stats
		    WHERE group_id = $1 AND month = $2
		)
	`
	var exists bool
	err := r.pool.QueryRow(ctx, query, groupID, month).Scan(&exists)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("check stats: %w", err)
	}
	return exists, nil
}
