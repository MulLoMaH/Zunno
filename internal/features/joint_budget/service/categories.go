package budget_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (s *BudgetService) CreateCategory(
	ctx context.Context,
	groupID uuid.UUID,
	name, catType string,
	budgetLimit float64,
) (domain.Category, error) {
	if err := validateCategory(name, catType, budgetLimit); err != nil {
		return domain.Category{}, err
	}

	cat := domain.Category{
		GroupID:     groupID,
		Name:        name,
		Type:        catType,
		BudgetLimit: budgetLimit,
	}
	created, err := s.budget.CreateCategory(ctx, cat)
	if err != nil {
		return domain.Category{}, fmt.Errorf("create category: %w", err)
	}
	return created, nil
}

func (s *BudgetService) GetCategories(
	ctx context.Context,
	groupID uuid.UUID,
) ([]domain.Category, error) {
	cats, err := s.budget.GetCategories(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("get categories: %w", err)
	}
	return cats, nil
}

func (s *BudgetService) UpdateCategory(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
	name, catType string,
	budgetLimit float64,
	expectedVersion int64,
) (domain.Category, error) {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return domain.Category{}, err
	}

	if err := validateCategory(name, catType, budgetLimit); err != nil {
		return domain.Category{}, err
	}

	updated, err := s.budget.UpdateCategory(ctx, categoryID, name, catType, budgetLimit, expectedVersion)
	if err != nil {
		return domain.Category{}, fmt.Errorf("update category: %w", err)
	}
	return updated, nil
}

func (s *BudgetService) DeleteCategory(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
) error {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return err
	}
	if err := s.budget.DeleteCategory(ctx, categoryID); err != nil {
		return fmt.Errorf("delete category: %w", err)
	}
	return nil
}

// --- helpers ---

func (s *BudgetService) ensureCategoryInGroup(
	ctx context.Context,
	categoryID, groupID uuid.UUID,
) (domain.Category, error) {
	cat, err := s.budget.GetCategory(ctx, categoryID)
	if err != nil {
		return domain.Category{}, err
	}
	if cat.GroupID != groupID {
		return domain.Category{}, core_errors.ErrCategoryNotFound
	}
	return cat, nil
}

func validateCategory(name, catType string, limit float64) error {
	nameLen := len([]rune(name))
	if nameLen < 1 || nameLen > 100 {
		return fmt.Errorf("category name length: %w", core_errors.ErrInvalidArgument)
	}
	if catType != domain.CategoryTypeFixed && catType != domain.CategoryTypeSpontaneous {
		return fmt.Errorf("invalid category type: %w", core_errors.ErrInvalidArgument)
	}
	if limit < 0 {
		return fmt.Errorf("budget limit must be >= 0: %w", core_errors.ErrInvalidArgument)
	}
	return nil
}
