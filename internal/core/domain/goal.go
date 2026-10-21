package domain

import (
	"time"

	"github.com/google/uuid"
)

type GoalCategory struct {
	ID       uuid.UUID
	Version  int64
	GroupID  uuid.UUID
	Name     string
	Position int

	// DueDate — дедлайн категории (nil = без дедлайна).
	DueDate *time.Time
	// NotifiedDueAt — когда отправили напоминание о дедлайне (nil = ещё нет).
	NotifiedDueAt *time.Time
}

type GoalItem struct {
	ID          uuid.UUID
	Version     int64
	CategoryID  uuid.UUID
	Title       string
	Description string
	Done        bool
	CreatedAt   time.Time
	DoneAt      *time.Time
	Position    int
}
