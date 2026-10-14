package budget_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
)

func (r *BudgetRepository) CreateCategory(
	ctx context.Context,
	cat domain.Category,
) (domain.Category, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.categories (group_id, name, type, budget_limit)
		VALUES ($1, $2, $3, $4)
		RETURNING id, version, group_id, name, type, budget_limit, created_at
	`
	var m CategoryModel
	err := r.pool.QueryRow(ctx, query, cat.GroupID, cat.Name, cat.Type, cat.BudgetLimit).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Type, &m.BudgetLimit, &m.CreatedAt,
	)
	if err != nil {
		return domain.Category{}, fmt.Errorf("create category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *BudgetRepository) GetCategories(
	ctx context.Context,
	groupID uuid.UUID,
) ([]domain.Category, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name, type, budget_limit, created_at
		FROM zunno.categories
		WHERE group_id = $1
		ORDER BY name ASC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	var cats []domain.Category
	for rows.Next() {
		var m CategoryModel
		if err := rows.Scan(&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Type, &m.BudgetLimit, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		cats = append(cats, categoryFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}
	return cats, nil
}

func (r *BudgetRepository) GetCategory(
	ctx context.Context,
	categoryID uuid.UUID,
) (domain.Category, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, name, type, budget_limit, created_at
		FROM zunno.categories
		WHERE id = $1
	`
	var m CategoryModel
	err := r.pool.QueryRow(ctx, query, categoryID).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Type, &m.BudgetLimit, &m.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Category{}, core_errors.ErrCategoryNotFound
		}
		return domain.Category{}, fmt.Errorf("get category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *BudgetRepository) UpdateCategory(
	ctx context.Context,
	categoryID uuid.UUID,
	name string,
	catType string,
	budgetLimit float64,
	expectedVersion int64,
) (domain.Category, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.categories
		SET name         = $1,
		    type         = $2,
		    budget_limit = $3,
		    version      = version + 1
		WHERE id = $4 AND version = $5
		RETURNING id, version, group_id, name, type, budget_limit, created_at
	`
	var m CategoryModel
	err := r.pool.QueryRow(ctx, query, name, catType, budgetLimit, categoryID, expectedVersion).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.Name, &m.Type, &m.BudgetLimit, &m.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Category{}, core_errors.ErrConflict
		}
		return domain.Category{}, fmt.Errorf("update category: %w", err)
	}
	return categoryFromModel(m), nil
}

func (r *BudgetRepository) DeleteCategory(ctx context.Context, categoryID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `DELETE FROM zunno.categories WHERE id = $1`
	tag, err := r.pool.Exec(ctx, query, categoryID)
	if err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrCategoryNotFound
	}
	return nil
}
