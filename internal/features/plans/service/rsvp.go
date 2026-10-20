package plan_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *PlanService) SetRSVP(ctx context.Context, groupID, eventID, userID uuid.UUID, status string) error {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return err
	}
	if status != "going" && status != "not_going" && status != "maybe" {
		return fmt.Errorf("invalid status: %w", core_errors.ErrInvalidArgument)
	}
	return s.plans.SetRSVP(ctx, eventID, userID, status)
}

func (s *PlanService) GetRSVPs(ctx context.Context, groupID, eventID uuid.UUID) ([]domain.PlanAttendee, error) {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return nil, err
	}
	return s.plans.GetRSVPs(ctx, eventID)
}
