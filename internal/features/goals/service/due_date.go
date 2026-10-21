package goal_service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

// SetGoalCategoryDueDate — установить/снять дедлайн у категории.
// Проверяет, что категория принадлежит запрошенной группе.
func (s *GoalService) SetGoalCategoryDueDate(
	ctx context.Context,
	groupID, categoryID uuid.UUID,
	dueDate *time.Time,
) (domain.GoalCategory, error) {
	cat, err := s.goals.GetGoalCategory(ctx, categoryID)
	if err != nil {
		return domain.GoalCategory{}, err
	}
	if cat.GroupID != groupID {
		return domain.GoalCategory{}, core_errors.ErrGoalCategoryNotFound
	}

	updated, err := s.goals.SetGoalCategoryDueDate(ctx, categoryID, dueDate)
	if err != nil {
		return domain.GoalCategory{}, fmt.Errorf("set due date: %w", err)
	}
	return updated, nil
}
