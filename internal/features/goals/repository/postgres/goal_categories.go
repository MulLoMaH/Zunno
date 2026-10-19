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

func (r *GoalsRepository) CreateGoalCategory(
	ctx context.Context,
	cat domain.GoalCategory,
) (domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.goal_categories (group_id, name, position)
		VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM zunno.goal_categories WHERE group_id = $1))
		RETURNING id, version, group_id, name, position
	`
	var m GoalCategoryModel
	err := r.pool.QueryRow(ctx, query, cat.GroupID, cat.Name).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Position,
	)
	if err != nil {
		return domain.GoalCategory{}, fmt.Errorf("create goal category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *GoalsRepository) GetGoalCategories(
	ctx context.Context,
	groupID uuid.UUID,
) ([]domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name
		FROM zunno.goal_categories
		WHERE group_id = $1
		ORDER BY position ASC, name ASC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query goal categories: %w", err)
	}
	defer rows.Close()

	var cats []domain.GoalCategory
	for rows.Next() {
		var m GoalCategoryModel
		if err := rows.Scan(&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Position); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, categoryFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}
	return cats, nil
}

func (r *GoalsRepository) GetGoalCategory(
	ctx context.Context,
	categoryID uuid.UUID,
) (domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name
		FROM zunno.goal_categories
		WHERE id = $1
	`
	var m GoalCategoryModel
	err := r.pool.QueryRow(ctx, query, categoryID).Scan(&m.ID, &m.Version, &m.GroupID, &m.Name)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.GoalCategory{}, core_errors.ErrGoalCategoryNotFound
		}
		return domain.GoalCategory{}, fmt.Errorf("get category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *GoalsRepository) UpdateGoalCategory(
	ctx context.Context,
	categoryID uuid.UUID,
	name string,
	expectedVersion int64,
) (domain.GoalCategory, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.goal_categories
		SET name = $1, version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING id, version, group_id, name, position
	`
	var m GoalCategoryModel
	err := r.pool.QueryRow(ctx, query, name, categoryID, expectedVersion).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Position,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.GoalCategory{}, core_errors.ErrConflict
		}
		return domain.GoalCategory{}, fmt.Errorf("update category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *GoalsRepository) DeleteGoalCategory(ctx context.Context, categoryID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `DELETE FROM zunno.goal_categories WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, categoryID)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrGoalCategoryNotFound
	}
	return nil
}
