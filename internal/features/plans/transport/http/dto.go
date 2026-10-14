package plan_transport_http

import (
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type PlanDTOResponse struct {
	ID          uuid.UUID  `json:"id"`
	Version     int64      `json:"version"`
	GroupID     uuid.UUID  `json:"group_id"`
	CreatorID   uuid.UUID  `json:"creator_id"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	EventDate   time.Time  `json:"event_date"`
	IsDone      bool       `json:"is_done"`
	CreatedAt   time.Time  `json:"created_at"`
	DoneAt      *time.Time `json:"done_at"`
}

type ChecklistDTOResponse struct {
	ID        uuid.UUID  `json:"id"`
	Version   int64      `json:"version"`
	EventID   uuid.UUID  `json:"event_id"`
	Text      string     `json:"text"`
	IsChecked bool       `json:"is_checked"`
	CheckedAt *time.Time `json:"checked_at"`
}

func planDTOFromDomain(p domain.PlanEvent) PlanDTOResponse {
	return PlanDTOResponse{
		ID:          p.ID,
		Version:     p.Version,
		GroupID:     p.GroupID,
		CreatorID:   p.CreatorID,
		Title:       p.Title,
		Description: p.Description,
		EventDate:   p.EventDate,
		IsDone:      p.IsDone,
		CreatedAt:   p.CreatedAt,
		DoneAt:      p.DoneAt,
	}
}

func plansDTOsFromDomains(ps []domain.PlanEvent) []PlanDTOResponse {
	out := make([]PlanDTOResponse, len(ps))
	for i, p := range ps {
		out[i] = planDTOFromDomain(p)
	}
	return out
}

func checklistDTOFromDomain(c domain.ChecklistItem) ChecklistDTOResponse {
	return ChecklistDTOResponse{
		ID:        c.ID,
		Version:   c.Version,
		EventID:   c.EventID,
		Text:      c.Text,
		IsChecked: c.IsChecked,
		CheckedAt: c.CheckedAt,
	}
}

func checklistDTOsFromDomains(items []domain.ChecklistItem) []ChecklistDTOResponse {
	out := make([]ChecklistDTOResponse, len(items))
	for i, it := range items {
		out[i] = checklistDTOFromDomain(it)
	}
	return out
}
