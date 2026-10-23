package savings_transport_http

import (
	"context"
	"net/http"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	savings_service "github.com/MulLoMaH/Zunno/internal/features/savings/service"
	"github.com/google/uuid"
)

type SavingsHTTPHandler struct {
	service SavingsService
}

type SavingsService interface {
	CreateGoal(ctx context.Context, groupID uuid.UUID, in savings_service.CreateGoalInput) (domain.SavingsGoal, error)
	ListGoals(ctx context.Context, groupID uuid.UUID) ([]domain.SavingsGoal, error)
	GetWallet(ctx context.Context, groupID uuid.UUID) (domain.WalletBalance, error)
	DeleteGoal(ctx context.Context, groupID, goalID uuid.UUID) error
	Transfer(ctx context.Context, groupID uuid.UUID, in savings_service.TransferInput) (domain.WalletBalance, error)
}

func NewSavingsHTTPHandler(service SavingsService) *SavingsHTTPHandler {
	return &SavingsHTTPHandler{service: service}
}

func (h *SavingsHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{Method: http.MethodGet, Path: "/groups/{id}/wallet", Handler: h.GetWallet},
		{Method: http.MethodPost, Path: "/groups/{id}/savings", Handler: h.CreateGoal},
		{Method: http.MethodGet, Path: "/groups/{id}/savings", Handler: h.ListGoals},
		{Method: http.MethodDelete, Path: "/groups/{id}/savings/{goalId}", Handler: h.DeleteGoal},
		{Method: http.MethodPost, Path: "/groups/{id}/savings/{goalId}/transfer", Handler: h.Transfer},
	}
}
