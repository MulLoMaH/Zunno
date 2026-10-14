package plans_postgres_repository

import (
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type PlanModel struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	CreatorID   uuid.UUID
	Title       string
	Description string
	EventDate   time.Time
	IsDone      bool
	CreatedAt   time.Time
	DoneAt      *time.Time
}

type ChecklistModel struct {
	ID        uuid.UUID
	Version   int64
	EventID   uuid.UUID
	Text      string
	IsChecked bool
	CheckedAt *time.Time
}

func planFromModel(m PlanModel) domain.PlanEvent {
	return domain.PlanEvent{
		ID:          m.ID,
		Version:     m.Version,
		GroupID:     m.GroupID,
		CreatorID:   m.CreatorID,
		Title:       m.Title,
		Description: m.Description,
		EventDate:   m.EventDate,
		IsDone:      m.IsDone,
		CreatedAt:   m.CreatedAt,
		DoneAt:      m.DoneAt,
	}
}

func checklistFromModel(m ChecklistModel) domain.ChecklistItem {
	return domain.ChecklistItem{
		ID:        m.ID,
		Version:   m.Version,
		EventID:   m.EventID,
		Text:      m.Text,
		IsChecked: m.IsChecked,
		CheckedAt: m.CheckedAt,
	}
}
