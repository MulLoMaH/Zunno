package plan_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *PlanService) CreateComment(ctx context.Context, groupID, eventID, userID uuid.UUID, text string) (domain.PlanComment, error) {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return domain.PlanComment{}, err
	}
	if len([]rune(text)) < 1 || len([]rune(text)) > 1000 {
		return domain.PlanComment{}, fmt.Errorf("comment text length: %w", core_errors.ErrInvalidArgument)
	}
	return s.plans.CreateComment(ctx, eventID, userID, text)
}

func (s *PlanService) GetComments(ctx context.Context, groupID, eventID uuid.UUID) ([]domain.PlanComment, error) {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return nil, err
	}
	return s.plans.GetComments(ctx, eventID)
}
