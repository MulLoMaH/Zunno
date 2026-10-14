package goal_transport_http

import (
	"context"
	"net/http"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	"github.com/google/uuid"
)

type GoalsHTTPHandler struct {
	goalService GoalService
}

type GoalService interface {
	CreateGoalCategory(ctx context.Context, groupID uuid.UUID, name string) (domain.GoalCategory, error)
	GetGoalCategories(ctx context.Context, groupID uuid.UUID) ([]domain.GoalCategory, error)
	UpdateGoalCategory(ctx context.Context, groupID, categoryID uuid.UUID, name string, expectedVersion int64) (domain.GoalCategory, error)
	DeleteGoalCategory(ctx context.Context, groupID, categoryID uuid.UUID) error

	CreateGoalItem(ctx context.Context, groupID, categoryID uuid.UUID, title, description string) (domain.GoalItem, error)
	GetGoalItems(ctx context.Context, groupID, categoryID uuid.UUID) ([]domain.GoalItem, error)
	MarkGoalItemDone(ctx context.Context, groupID, itemID uuid.UUID, done bool, expectedVersion int64) (domain.GoalItem, error)
	DeleteGoalItem(ctx context.Context, groupID, itemID uuid.UUID) error
}

func NewGoalsHTTPHandler(goalService GoalService) *GoalsHTTPHandler {
	return &GoalsHTTPHandler{goalService: goalService}
}

func (h *GoalsHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/goal-categories",
			Handler: h.CreateCategory,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/goal-categories",
			Handler: h.GetCategories,
		},
		{
			Method:  http.MethodPatch,
			Path:    "/groups/{id}/goal-categories/{catId}",
			Handler: h.UpdateCategory,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/goal-categories/{catId}",
			Handler: h.DeleteCategory,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/goal-categories/{catId}/items",
			Handler: h.CreateItem,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/goal-categories/{catId}/items",
			Handler: h.GetItems,
		},
		{
			Method:  http.MethodPatch,
			Path:    "/groups/{id}/goal-items/{itemId}",
			Handler: h.MarkItemDone,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/goal-items/{itemId}",
			Handler: h.DeleteItem,
		},
	}
}
