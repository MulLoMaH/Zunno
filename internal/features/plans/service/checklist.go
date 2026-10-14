package plan_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (s *PlanService) CreateChecklistItem(
	ctx context.Context,
	groupID, eventID uuid.UUID,
	text string,
) (domain.ChecklistItem, error) {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return domain.ChecklistItem{}, err
	}
	if len([]rune(text)) < 1 || len([]rune(text)) > 500 {
		return domain.ChecklistItem{}, fmt.Errorf("text length: %w", core_errors.ErrInvalidArgument)
	}

	item := domain.ChecklistItem{
		EventID: eventID,
		Text:    text,
	}
	created, err := s.plans.CreateChecklistItem(ctx, item)
	if err != nil {
		return domain.ChecklistItem{}, fmt.Errorf("create checklist: %w", err)
	}
	return created, nil
}

func (s *PlanService) GetChecklist(
	ctx context.Context,
	groupID, eventID uuid.UUID,
) ([]domain.ChecklistItem, error) {
	if _, err := s.ensurePlanInGroup(ctx, eventID, groupID); err != nil {
		return nil, err
	}
	items, err := s.plans.GetChecklist(ctx, eventID)
	if err != nil {
		return nil, fmt.Errorf("get checklist: %w", err)
	}
	return items, nil
}

func (s *PlanService) UpdateChecklistItem(
	ctx context.Context,
	groupID, itemID uuid.UUID,
	text string,
	isChecked bool,
	expectedVersion int64,
) (domain.ChecklistItem, error) {
	if _, err := s.ensureChecklistInGroup(ctx, itemID, groupID); err != nil {
		return domain.ChecklistItem{}, err
	}
	if len([]rune(text)) < 1 || len([]rune(text)) > 500 {
		return domain.ChecklistItem{}, fmt.Errorf("text length: %w", core_errors.ErrInvalidArgument)
	}

	updated, err := s.plans.UpdateChecklistItem(ctx, itemID, text, isChecked, expectedVersion)
	if err != nil {
		return domain.ChecklistItem{}, fmt.Errorf("update checklist: %w", err)
	}
	return updated, nil
}

func (s *PlanService) DeleteChecklistItem(
	ctx context.Context,
	groupID, itemID uuid.UUID,
) error {
	if _, err := s.ensureChecklistInGroup(ctx, itemID, groupID); err != nil {
		return err
	}
	if err := s.plans.DeleteChecklistItem(ctx, itemID); err != nil {
		return fmt.Errorf("delete checklist: %w", err)
	}
	return nil
}

func (s *PlanService) ensureChecklistInGroup(
	ctx context.Context,
	itemID, groupID uuid.UUID,
) (domain.ChecklistItem, error) {
	item, err := s.plans.GetChecklistItem(ctx, itemID)
	if err != nil {
		return domain.ChecklistItem{}, err
	}
	if _, err := s.ensurePlanInGroup(ctx, item.EventID, groupID); err != nil {
		return domain.ChecklistItem{}, err
	}
	return item, nil
}
