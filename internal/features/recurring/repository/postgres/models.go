package recurring_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type RecurringModel struct {
	ID              uuid.UUID
	GroupID         uuid.UUID
	UserID          uuid.UUID
	CategoryID      *uuid.UUID
	Title           string
	Type            string
	Amount          float64
	DayOfMonth      int
	IsActive        bool
	LastProcessedAt *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func recurringFromModel(m RecurringModel) domain.RecurringTransaction {
	return domain.RecurringTransaction{
		ID:              m.ID,
		GroupID:         m.GroupID,
		UserID:          m.UserID,
		CategoryID:      m.CategoryID,
		Title:           m.Title,
		Type:            m.Type,
		Amount:          m.Amount,
		DayOfMonth:      m.DayOfMonth,
		IsActive:        m.IsActive,
		LastProcessedAt: m.LastProcessedAt,
		CreatedAt:       m.CreatedAt,
		UpdatedAt:       m.UpdatedAt,
	}
}
