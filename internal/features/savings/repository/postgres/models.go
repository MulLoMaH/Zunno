package savings_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type SavingsModel struct {
	ID            uuid.UUID
	Version       int64
	GroupID       uuid.UUID
	Name          string
	TargetAmount  float64
	CurrentAmount float64
	Icon          string
	Color         *string
	IsArchived    bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func savingsFromModel(m SavingsModel) domain.SavingsGoal {
	return domain.SavingsGoal{
		ID:            m.ID,
		Version:       m.Version,
		GroupID:       m.GroupID,
		Name:          m.Name,
		TargetAmount:  m.TargetAmount,
		CurrentAmount: m.CurrentAmount,
		Icon:          m.Icon,
		Color:         derefString(m.Color),
		IsArchived:    m.IsArchived,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
