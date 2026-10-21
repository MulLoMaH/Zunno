package goal_transport_http

import (
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type GoalCategoryDTOResponse struct {
	ID      uuid.UUID `json:"id"`
	Version int64     `json:"version"`
	GroupID uuid.UUID `json:"group_id"`
	Name    string    `json:"name"`

	DueDate       *time.Time `json:"due_date,omitempty"`
	NotifiedDueAt *time.Time `json:"notified_due_at,omitempty"`
}

type GoalItemDTOResponse struct {
	ID          uuid.UUID  `json:"id"`
	Version     int64      `json:"version"`
	CategoryID  uuid.UUID  `json:"category_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Done        bool       `json:"done"`
	CreatedAt   time.Time  `json:"created_at"`
	DoneAt      *time.Time `json:"done_at"`
}

func categoryDTOFromDomain(c domain.GoalCategory) GoalCategoryDTOResponse {
	return GoalCategoryDTOResponse{
		ID:      c.ID,
		Version: c.Version,
		GroupID: c.GroupID,
		Name:    c.Name,

		DueDate:       c.DueDate,
		NotifiedDueAt: c.NotifiedDueAt,
	}
}

func categoriesDTOsFromDomains(cs []domain.GoalCategory) []GoalCategoryDTOResponse {
	out := make([]GoalCategoryDTOResponse, len(cs))
	for i, c := range cs {
		out[i] = categoryDTOFromDomain(c)
	}
	return out
}

func itemDTOFromDomain(i domain.GoalItem) GoalItemDTOResponse {
	return GoalItemDTOResponse{
		ID:          i.ID,
		Version:     i.Version,
		CategoryID:  i.CategoryID,
		Title:       i.Title,
		Description: i.Description,
		Done:        i.Done,
		CreatedAt:   i.CreatedAt,
		DoneAt:      i.DoneAt,
	}
}

func itemsDTOsFromDomains(items []domain.GoalItem) []GoalItemDTOResponse {
	out := make([]GoalItemDTOResponse, len(items))
	for i, it := range items {
		out[i] = itemDTOFromDomain(it)
	}
	return out
}
