package goal_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (s *GoalService) CreateGoalCategory(
	ctx context.Context,
	groupID uuid.UUID,
	name string,
) (domain.GoalCategory, error) {
	nameLen := len([]rune(name))
	if nameLen < 1 || nameLen > 100 {
		return domain.GoalCategory{}, fmt.Errorf("category name length: %w", core_errors.ErrInvalidArgument)
	}

	cat := domain.GoalCategory{
		GroupID: groupID,
		Name:    name,
	}
	created, err := s.goals.CreateGoalCategory(ctx, cat)
	if err != nil {
		return domain.GoalCategory{}, fmt.Errorf("create goal category: %w", err)
	}
	return created, nil
}

func (s *GoalService) GetGoalCategories(
	ctx context.Context,
	groupID uuid.UUID,
) ([]domain.GoalCategory, error) {
	cats, err := s.goals.GetGoalCategories(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("get goal categories: %w", err)
	}
	return cats, nil
}

// ensureCategoryInGroup — общая проверка принадлежности категории группе.
func (s *GoalService) ensureCategoryInGroup(
	ctx context.Context,
	categoryID, groupID uuid.UUID,
) (domain.GoalCategory, error) {
	cat, err := s.goals.GetGoalCategory(ctx, categoryID)
	if err != nil {
		return domain.GoalCategory{}, err
	}
	if cat.GroupID != groupID {
		return domain.GoalCategory{}, core_errors.ErrGoalCategoryNotFound
	}
	return cat, nil
}

func (s *GoalService) UpdateGoalCategory(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
	name string,
	expectedVersion int64,
) (domain.GoalCategory, error) {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return domain.GoalCategory{}, err
	}

	nameLen := len([]rune(name))
	if nameLen < 1 || nameLen > 100 {
		return domain.GoalCategory{}, fmt.Errorf("category name length: %w", core_errors.ErrInvalidArgument)
	}

	updated, err := s.goals.UpdateGoalCategory(ctx, categoryID, name, expectedVersion)
	if err != nil {
		return domain.GoalCategory{}, fmt.Errorf("update goal category: %w", err)
	}
	return updated, nil
}

func (s *GoalService) DeleteGoalCategory(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
) error {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return err
	}
	if err := s.goals.DeleteGoalCategory(ctx, categoryID); err != nil {
		return fmt.Errorf("delete goal category: %w", err)
	}
	return nil
}
