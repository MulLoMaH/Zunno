package goals_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

func (r *GoalsRepository) CreateGoalItem(
	ctx context.Context,
	item domain.GoalItem,
) (domain.GoalItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.goal_items (category_id, title, description, position)
		VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), -1) + 1 FROM zunno.goal_items WHERE category_id = $1))
		RETURNING id, version, category_id, title, description, done, created_at, done_at, position
	`
	var m GoalItemModel
	err := r.pool.QueryRow(ctx, query, item.CategoryID, item.Title, item.Description).Scan(
		&m.ID, &m.Version, &m.CategoryID, &m.Title, &m.Description, &m.Done, &m.CreatedAt, &m.DoneAt, &m.Position,
	)
	if err != nil {
		return domain.GoalItem{}, fmt.Errorf("create goal item: %w", err)
	}
	return itemFromModel(m), nil
}

func (r *GoalsRepository) GetGoalItems(
	ctx context.Context,
	categoryID uuid.UUID,
) ([]domain.GoalItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, category_id, title, description, done, created_at, done_at, position
		FROM zunno.goal_items
		WHERE category_id = $1
		ORDER BY position ASC, created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, categoryID)
	if err != nil {
		return nil, fmt.Errorf("query goal items: %w", err)
	}
	defer rows.Close()

	var items []domain.GoalItem
	for rows.Next() {
		var m GoalItemModel
		if err := rows.Scan(&m.ID, &m.Version, &m.CategoryID, &m.Title, &m.Description, &m.Done, &m.CreatedAt, &m.DoneAt, &m.Position); err != nil {
			return nil, fmt.Errorf("scan item: %w", err)
		}
		items = append(items, itemFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate items: %w", err)
	}
	return items, nil
}

func (r *GoalsRepository) GetGoalItem(
	ctx context.Context,
	itemID uuid.UUID,
) (domain.GoalItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, category_id, title, description, done, created_at, done_at, position
		FROM zunno.goal_items
		WHERE id = $1
	`
	var m GoalItemModel
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&m.ID, &m.Version, &m.CategoryID, &m.Title, &m.Description, &m.Done, &m.CreatedAt, &m.DoneAt, &m.Position,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.GoalItem{}, core_errors.ErrGoalItemNotFound
		}
		return domain.GoalItem{}, fmt.Errorf("get item: %w", err)
	}
	return itemFromModel(m), nil
}

func (r *GoalsRepository) MarkGoalItemDone(
	ctx context.Context,
	itemID uuid.UUID,
	done bool,
	expectedVersion int64,
) (domain.GoalItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.goal_items
		SET done    = $1,
		    done_at = CASE WHEN $1 THEN now() ELSE NULL END,
		    version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING id, version, category_id, title, description, done, created_at, done_at, position
	`
	var m GoalItemModel
	err := r.pool.QueryRow(ctx, query, done, itemID, expectedVersion).Scan(
		&m.ID, &m.Version, &m.CategoryID, &m.Title, &m.Description, &m.Done, &m.CreatedAt, &m.DoneAt, &m.Position,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.GoalItem{}, core_errors.ErrConflict
		}
		return domain.GoalItem{}, fmt.Errorf("mark item done: %w", err)
	}
	return itemFromModel(m), nil
}

func (r *GoalsRepository) DeleteGoalItem(ctx context.Context, itemID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `DELETE FROM zunno.goal_items WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, itemID)
	if err != nil {
		return fmt.Errorf("delete item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrGoalItemNotFound
	}
	return nil
}
