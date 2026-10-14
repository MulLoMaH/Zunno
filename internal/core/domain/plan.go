package domain

import (
	"time"

	"github.com/google/uuid"
)

type PlanEvent struct {
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

type ChecklistItem struct {
	ID        uuid.UUID
	Version   int64
	EventID   uuid.UUID
	Text      string
	IsChecked bool
	CheckedAt *time.Time
}
