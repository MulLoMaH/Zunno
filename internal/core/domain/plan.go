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

	// RecurrenceRule — 'daily' | 'weekly' | 'monthly' или nil (разовое).
	RecurrenceRule  *string
	RecurrenceUntil *time.Time
	// ParentPlanID != nil для материализованных дочерних вхождений серии.
	ParentPlanID *uuid.UUID
}

type ChecklistItem struct {
	ID        uuid.UUID
	Version   int64
	EventID   uuid.UUID
	Text      string
	IsChecked bool
	CheckedAt *time.Time
}

type PlanAttendee struct {
	UserID    uuid.UUID
	EventID   uuid.UUID
	Status    string // "going", "not_going", "maybe"
	UpdatedAt time.Time
}

type PlanComment struct {
	ID        uuid.UUID
	EventID   uuid.UUID
	UserID    uuid.UUID
	FullName  string
	Text      string
	CreatedAt time.Time
}
