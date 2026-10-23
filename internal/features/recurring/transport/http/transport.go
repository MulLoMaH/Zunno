package recurring_transport_http

import (
	"context"
	"net/http"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	recurring_service "github.com/MulLoMaH/Zunno/internal/features/recurring/service"
	"github.com/google/uuid"
)

type RecurringHTTPHandler struct {
	service RecurringService
}

type RecurringService interface {
	Create(ctx context.Context, groupID, userID uuid.UUID, in recurring_service.CreateRecurringInput) (domain.RecurringTransaction, error)
	List(ctx context.Context, groupID uuid.UUID) ([]domain.RecurringTransaction, error)
	Get(ctx context.Context, groupID, id uuid.UUID) (domain.RecurringTransaction, error)
	Update(ctx context.Context, groupID, id uuid.UUID, in recurring_service.CreateRecurringInput, isActive bool) (domain.RecurringTransaction, error)
	Delete(ctx context.Context, groupID, id uuid.UUID) error
}

func NewRecurringHTTPHandler(service RecurringService) *RecurringHTTPHandler {
	return &RecurringHTTPHandler{service: service}
}

func (h *RecurringHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/recurring",
			Handler: h.Create,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/recurring",
			Handler: h.List,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/recurring/{recId}",
			Handler: h.Get,
		},
		{
			Method:  http.MethodPatch,
			Path:    "/groups/{id}/recurring/{recId}",
			Handler: h.Update,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/recurring/{recId}",
			Handler: h.Delete,
		},
	}
}
