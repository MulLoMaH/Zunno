package credits_transport_http

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	credits_service "github.com/MulLoMaH/Zunno/internal/features/credits/service"
)

type CreditsHTTPHandler struct {
	creditService CreditService
}

// CreditService — то, что транспорт ожидает от сервиса.
type CreditService interface {
	CreateCredit(ctx context.Context, groupID, userID uuid.UUID, in credits_service.CreateCreditInput) (credits_service.CreditWithSummary, error)
	ListCredits(ctx context.Context, groupID uuid.UUID) ([]credits_service.CreditWithSummary, error)
	GetCreditDetail(ctx context.Context, groupID, creditID uuid.UUID) (credits_service.CreditDetail, error)
	DeleteCredit(ctx context.Context, groupID, creditID uuid.UUID) error
	Pay(ctx context.Context, groupID, userID, creditID uuid.UUID, in credits_service.PayInput) (credits_service.CreditWithSummary, error)
}

func NewCreditsHTTPHandler(creditService CreditService) *CreditsHTTPHandler {
	return &CreditsHTTPHandler{creditService: creditService}
}

func (h *CreditsHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/credits",
			Handler: h.Create,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/credits",
			Handler: h.List,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/credits/{creditId}",
			Handler: h.Detail,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/credits/{creditId}",
			Handler: h.Delete,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/credits/{creditId}/pay",
			Handler: h.Pay,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/credits/{creditId}/early-pay",
			Handler: h.EarlyPay,
		},
	}
}
