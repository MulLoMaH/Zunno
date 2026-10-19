package goals_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type GoalCategoryModel struct {
	Position int
	ID      uuid.UUID
	Version int64
	GroupID uuid.UUID
	Name    string
}

type GoalItemModel struct {
	Position int
	ID          uuid.UUID
	Version     int64
	CategoryID  uuid.UUID
	Title       string
	Description string
	Done        bool
	CreatedAt   time.Time
	DoneAt      *time.Time
}

func categoryFromModel(m GoalCategoryModel) domain.GoalCategory {
	return domain.GoalCategory{
		Position: m.Position,
		ID:      m.ID,
		Version: m.Version,
		GroupID: m.GroupID,
		Name:    m.Name,
	}
}

func itemFromModel(m GoalItemModel) domain.GoalItem {
	return domain.GoalItem{
		Position: m.Position,
		ID:          m.ID,
		Version:     m.Version,
		CategoryID:  m.CategoryID,
		Title:       m.Title,
		Description: m.Description,
		Done:        m.Done,
		CreatedAt:   m.CreatedAt,
		DoneAt:      m.DoneAt,
	}
}
