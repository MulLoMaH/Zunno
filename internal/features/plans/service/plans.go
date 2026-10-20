package plan_service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (s *PlanService) CreatePlan(
	ctx context.Context,
	groupID, creatorID uuid.UUID,
	title, description string,
	eventDate time.Time,
	recurrence *RecurrenceInput,
) (domain.PlanEvent, error) {
	if len([]rune(title)) < 1 || len([]rune(title)) > 200 {
		return domain.PlanEvent{}, fmt.Errorf("title length: %w", core_errors.ErrInvalidArgument)
	}
	if eventDate.IsZero() {
		return domain.PlanEvent{}, fmt.Errorf("event_date required: %w", core_errors.ErrInvalidArgument)
	}
	if err := recurrence.validate(); err != nil {
		return domain.PlanEvent{}, fmt.Errorf("%w: %v", core_errors.ErrInvalidArgument, err)
	}

	p := domain.PlanEvent{
		GroupID:     groupID,
		CreatorID:   creatorID,
		Title:       title,
		Description: description,
		EventDate:   eventDate,
	}
	if recurrence != nil {
		rule := recurrence.Rule
		p.RecurrenceRule = &rule
		p.RecurrenceUntil = recurrence.Until
	}

	created, err := s.plans.CreatePlan(ctx, p)
	if err != nil {
		return domain.PlanEvent{}, fmt.Errorf("create plan: %w", err)
	}

	// Асинхронная материализация дочерних событий. Не блокирует ответ.
	if recurrence != nil {
		go s.materializeRecurrences(context.WithoutCancel(ctx), created, recurrence.Rule, recurrence.Until)
	}

	return created, nil
}

func (s *PlanService) GetPlans(
	ctx context.Context,
	groupID uuid.UUID,
	from, to time.Time,
) ([]domain.PlanEvent, error) {
	if from.IsZero() || to.IsZero() || to.Before(from) {
		return nil, fmt.Errorf("invalid period: %w", core_errors.ErrInvalidArgument)
	}
	plans, err := s.plans.GetPlans(ctx, groupID, from, to)
	if err != nil {
		return nil, fmt.Errorf("get plans: %w", err)
	}
	return plans, nil
}

func (s *PlanService) UpdatePlan(
	ctx context.Context,
	groupID, planID uuid.UUID,
	title, description string,
	eventDate time.Time,
	isDone bool,
	expectedVersion int64,
) (domain.PlanEvent, error) {
	if _, err := s.ensurePlanInGroup(ctx, planID, groupID); err != nil {
		return domain.PlanEvent{}, err
	}

	updated, err := s.plans.UpdatePlan(ctx, planID, title, description, eventDate, isDone, expectedVersion)
	if err != nil {
		return domain.PlanEvent{}, fmt.Errorf("update plan: %w", err)
	}
	return updated, nil
}

func (s *PlanService) DeletePlan(
	ctx context.Context,
	groupID, planID uuid.UUID,
) error {
	if _, err := s.ensurePlanInGroup(ctx, planID, groupID); err != nil {
		return err
	}
	if err := s.plans.DeletePlan(ctx, planID); err != nil {
		return fmt.Errorf("delete plan: %w", err)
	}
	return nil
}

func (s *PlanService) ensurePlanInGroup(
	ctx context.Context,
	planID, groupID uuid.UUID,
) (domain.PlanEvent, error) {
	p, err := s.plans.GetPlan(ctx, planID)
	if err != nil {
		return domain.PlanEvent{}, err
	}
	if p.GroupID != groupID {
		return domain.PlanEvent{}, core_errors.ErrPlanNotFound
	}
	return p, nil
}
