package goals_postgres_repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (r *GoalsRepository) ReorderGoalItems(
	ctx context.Context,
	categoryID uuid.UUID,
	itemIDs []uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `UPDATE zunno.goal_items SET position = $1 WHERE id = $2 AND category_id = $3`
	for i, id := range itemIDs {
		if _, err := tx.Exec(ctx, query, i, id, categoryID); err != nil {
			return fmt.Errorf("update position for %s: %w", id, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *GoalsRepository) ReorderGoalCategories(
	ctx context.Context,
	groupID uuid.UUID,
	categoryIDs []uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `UPDATE zunno.goal_categories SET position = $1 WHERE id = $2 AND group_id = $3`
	for i, id := range categoryIDs {
		if _, err := tx.Exec(ctx, query, i, id, groupID); err != nil {
			return fmt.Errorf("update position for %s: %w", id, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
