package goal_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *GoalService) ReorderGoalItems(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
	itemIDs []uuid.UUID,
) error {
	if _, err := s.ensureCategoryInGroup(ctx, categoryID, groupID); err != nil {
		return err
	}
	if err := s.goals.ReorderGoalItems(ctx, categoryID, itemIDs); err != nil {
		return fmt.Errorf("reorder goal items: %w", err)
	}
	return nil
}

func (s *GoalService) ReorderGoalCategories(
	ctx context.Context,
	groupID uuid.UUID,
	categoryIDs []uuid.UUID,
) error {
	if err := s.goals.ReorderGoalCategories(ctx, groupID, categoryIDs); err != nil {
		return fmt.Errorf("reorder goal categories: %w", err)
	}
	return nil
}
