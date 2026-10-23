package recurring_transport_http

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	recurring_service "github.com/MulLoMaH/Zunno/internal/features/recurring/service"
	"github.com/google/uuid"
)

type CreateRecurringRequest struct {
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Title      string     `json:"title"`
	Type       string     `json:"type"`
	Amount     float64    `json:"amount"`
	DayOfMonth int        `json:"day_of_month"`
}

type UpdateRecurringRequest struct {
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Title      string     `json:"title"`
	Type       string     `json:"type"`
	Amount     float64    `json:"amount"`
	DayOfMonth int        `json:"day_of_month"`
	IsActive   bool       `json:"is_active"`
}

type RecurringDTOResponse struct {
	ID              uuid.UUID  `json:"id"`
	GroupID         uuid.UUID  `json:"group_id"`
	UserID          uuid.UUID  `json:"user_id"`
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	Title           string     `json:"title"`
	Type            string     `json:"type"`
	Amount          float64    `json:"amount"`
	DayOfMonth      int        `json:"day_of_month"`
	IsActive        bool       `json:"is_active"`
	LastProcessedAt *time.Time `json:"last_processed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

func recurringDTOFromDomain(rt domain.RecurringTransaction) RecurringDTOResponse {
	return RecurringDTOResponse{
		ID:              rt.ID,
		GroupID:         rt.GroupID,
		UserID:          rt.UserID,
		CategoryID:      rt.CategoryID,
		Title:           rt.Title,
		Type:            rt.Type,
		Amount:          rt.Amount,
		DayOfMonth:      rt.DayOfMonth,
		IsActive:        rt.IsActive,
		LastProcessedAt: rt.LastProcessedAt,
		CreatedAt:       rt.CreatedAt,
		UpdatedAt:       rt.UpdatedAt,
	}
}

func recurringsDTOFromDomains(items []domain.RecurringTransaction) []RecurringDTOResponse {
	out := make([]RecurringDTOResponse, len(items))
	for i, rt := range items {
		out[i] = recurringDTOFromDomain(rt)
	}
	return out
}

func (r *CreateRecurringRequest) toServiceInput() recurring_service.CreateRecurringInput {
	return recurring_service.CreateRecurringInput{
		CategoryID: r.CategoryID,
		Title:      r.Title,
		Type:       r.Type,
		Amount:     r.Amount,
		DayOfMonth: r.DayOfMonth,
	}
}

func (r *UpdateRecurringRequest) toServiceInput() recurring_service.CreateRecurringInput {
	return recurring_service.CreateRecurringInput{
		CategoryID: r.CategoryID,
		Title:      r.Title,
		Type:       r.Type,
		Amount:     r.Amount,
		DayOfMonth: r.DayOfMonth,
	}
}
