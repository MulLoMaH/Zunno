package goal_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (s *GoalService) CreateGoalItem(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
	title, description string,
) (domain.GoalItem, error) {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return domain.GoalItem{}, err
	}

	titleLen := len([]rune(title))
	if titleLen < 1 || titleLen > 200 {
		return domain.GoalItem{}, fmt.Errorf("title length: %w", core_errors.ErrInvalidArgument)
	}

	item := domain.GoalItem{
		CategoryID:  categoryID,
		Title:       title,
		Description: description,
	}
	created, err := s.goals.CreateGoalItem(ctx, item)
	if err != nil {
		return domain.GoalItem{}, fmt.Errorf("create goal item: %w", err)
	}
	return created, nil
}

func (s *GoalService) GetGoalItems(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
) ([]domain.GoalItem, error) {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return nil, err
	}

	items, err := s.goals.GetGoalItems(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("get goal items: %w", err)
	}
	return items, nil
}

// ensureItemInGroup — через item → category → group.
func (s *GoalService) ensureItemInGroup(
	ctx context.Context,
	itemID, groupID uuid.UUID,
) (domain.GoalItem, error) {
	item, err := s.goals.GetGoalItem(ctx, itemID)
	if err != nil {
		return domain.GoalItem{}, err
	}
	if _, err := s.ensureCategoryInGroup(ctx, item.CategoryID, groupID); err != nil {
		return domain.GoalItem{}, err
	}
	return item, nil
}

func (s *GoalService) MarkGoalItemDone(
	ctx context.Context,
	groupID, itemID uuid.UUID,
	done bool,
	expectedVersion int64,
) (domain.GoalItem, error) {
	if _, err := s.ensureItemInGroup(ctx, itemID, groupID); err != nil {
		return domain.GoalItem{}, err
	}

	updated, err := s.goals.MarkGoalItemDone(ctx, itemID, done, expectedVersion)
	if err != nil {
		return domain.GoalItem{}, fmt.Errorf("mark goal item done: %w", err)
	}
	return updated, nil
}

func (s *GoalService) DeleteGoalItem(
	ctx context.Context,
	groupID, itemID uuid.UUID,
) error {
	if _, err := s.ensureItemInGroup(ctx, itemID, groupID); err != nil {
		return err
	}
	if err := s.goals.DeleteGoalItem(ctx, itemID); err != nil {
		return fmt.Errorf("delete goal item: %w", err)
	}
	return nil
}
