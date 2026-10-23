package recurring_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

type CreateRecurringInput struct {
	CategoryID *uuid.UUID
	Title      string
	Type       string
	Amount     float64
	DayOfMonth int
}

func (s *RecurringService) Create(ctx context.Context, groupID, userID uuid.UUID, in CreateRecurringInput) (domain.RecurringTransaction, error) {
	rt := domain.RecurringTransaction{
		GroupID:    groupID,
		UserID:     userID,
		CategoryID: in.CategoryID,
		Title:      in.Title,
		Type:       in.Type,
		Amount:     in.Amount,
		DayOfMonth: in.DayOfMonth,
		IsActive:   true,
	}
	if err := rt.Validate(); err != nil {
		return domain.RecurringTransaction{}, err
	}

	// Проверка, что категория принадлежит этой группе
	if rt.CategoryID != nil {
		catGroupID, err := s.budget.GetCategoryGroupID(ctx, *rt.CategoryID)
		if err != nil {
			return domain.RecurringTransaction{}, core_errors.ErrCategoryNotFound
		}
		if catGroupID != groupID {
			return domain.RecurringTransaction{}, fmt.Errorf("category does not belong to this group: %w", core_errors.ErrInvalidArgument)
		}
	}

	return s.recurring.CreateRecurring(ctx, rt)
}

func (s *RecurringService) List(ctx context.Context, groupID uuid.UUID) ([]domain.RecurringTransaction, error) {
	return s.recurring.ListRecurrings(ctx, groupID)
}

func (s *RecurringService) Get(ctx context.Context, groupID, id uuid.UUID) (domain.RecurringTransaction, error) {
	rt, err := s.recurring.GetRecurring(ctx, id)
	if err != nil {
		return domain.RecurringTransaction{}, err
	}
	if rt.GroupID != groupID {
		return domain.RecurringTransaction{}, core_errors.ErrRecurringNotFound
	}
	return rt, nil
}

func (s *RecurringService) Update(ctx context.Context, groupID, id uuid.UUID, in CreateRecurringInput, isActive bool) (domain.RecurringTransaction, error) {
	rt, err := s.Get(ctx, groupID, id)
	if err != nil {
		return domain.RecurringTransaction{}, err
	}
	rt.CategoryID = in.CategoryID
	rt.Title = in.Title
	rt.Type = in.Type
	rt.Amount = in.Amount
	rt.DayOfMonth = in.DayOfMonth
	rt.IsActive = isActive

	if err := rt.Validate(); err != nil {
		return domain.RecurringTransaction{}, err
	}

	return s.recurring.UpdateRecurring(ctx, id, rt)
}

func (s *RecurringService) Delete(ctx context.Context, groupID, id uuid.UUID) error {
	if _, err := s.Get(ctx, groupID, id); err != nil {
		return err
	}
	return s.recurring.DeleteRecurring(ctx, id)
}

var _ = fmt.Errorf
