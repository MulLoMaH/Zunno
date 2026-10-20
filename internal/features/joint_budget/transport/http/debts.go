package budget_transport_http

import (
	"net/http"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type MyDebtsResponse struct {
	Incoming []DebtDTOResponse `json:"incoming"` // мне должны
	Outgoing []DebtDTOResponse `json:"outgoing"` // я должен
}

// GetMyDebts — GET /groups/{id}/debts
// Возвращает все долги пользователя, разделённые на «мне должны» и «я должен».
func (h *BudgetHTTPHandler) GetMyDebts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	debts, err := h.budgetService.GetUserDebts(ctx, info.UserID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get user debts")
		return
	}

	resp := MyDebtsResponse{
		Incoming: make([]DebtDTOResponse, 0),
		Outgoing: make([]DebtDTOResponse, 0),
	}
	for _, d := range debts {
		if d.GroupID != info.GroupID {
			continue
		}
		if d.CreditorID == info.UserID {
			resp.Incoming = append(resp.Incoming, debtDTOFromDomain(d))
		} else if d.DebtorID == info.UserID {
			resp.Outgoing = append(resp.Outgoing, debtDTOFromDomain(d))
		}
	}

	responseHandler.JSONResponse(resp, http.StatusOK)
}

// PayDebt — POST /groups/{id}/debts/{debtId}/pay
// Только кредитор может отметить долг погашенным.
func (h *BudgetHTTPHandler) PayDebt(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	debtID, err := uuid.Parse(r.PathValue("debtId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid debt id")
		return
	}

	if err := h.budgetService.MarkDebtPaid(ctx, info.UserID, debtID); err != nil {
		responseHandler.ErrorResponse(err, "mark debt paid")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
