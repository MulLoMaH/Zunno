package plan_transport_http

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
)

type PlansHTTPHandler struct {
	planService PlanService
}

type PlanService interface {
	CreatePlan(ctx context.Context, groupID, creatorID uuid.UUID, title, description string, eventDate time.Time) (domain.PlanEvent, error)
	GetPlans(ctx context.Context, groupID uuid.UUID, from, to time.Time) ([]domain.PlanEvent, error)
	UpdatePlan(ctx context.Context, groupID, planID uuid.UUID, title, description string, eventDate time.Time, isDone bool, expectedVersion int64) (domain.PlanEvent, error)
	DeletePlan(ctx context.Context, groupID, planID uuid.UUID) error

	CreateChecklistItem(ctx context.Context, groupID, eventID uuid.UUID, text string) (domain.ChecklistItem, error)
	GetChecklist(ctx context.Context, groupID, eventID uuid.UUID) ([]domain.ChecklistItem, error)
	UpdateChecklistItem(ctx context.Context, groupID, itemID uuid.UUID, text string, isChecked bool, expectedVersion int64) (domain.ChecklistItem, error)
	DeleteChecklistItem(ctx context.Context, groupID, itemID uuid.UUID) error
}

func NewPlansHTTPHandler(planService PlanService) *PlansHTTPHandler {
	return &PlansHTTPHandler{planService: planService}
}

func (h *PlansHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{Method: http.MethodPost, Path: "/groups/{id}/plans", Handler: h.CreatePlan},
		{Method: http.MethodGet, Path: "/groups/{id}/plans", Handler: h.GetPlans},
		{Method: http.MethodPatch, Path: "/groups/{id}/plans/{planId}", Handler: h.UpdatePlan},
		{Method: http.MethodDelete, Path: "/groups/{id}/plans/{planId}", Handler: h.DeletePlan},

		{Method: http.MethodPost, Path: "/groups/{id}/plans/{planId}/checklist", Handler: h.CreateChecklist},
		{Method: http.MethodGet, Path: "/groups/{id}/plans/{planId}/checklist", Handler: h.GetChecklist},
		{Method: http.MethodPatch, Path: "/groups/{id}/checklist/{itemId}", Handler: h.UpdateChecklist},
		{Method: http.MethodDelete, Path: "/groups/{id}/checklist/{itemId}", Handler: h.DeleteChecklist},
	}
}
