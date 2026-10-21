package budget_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *BudgetHTTPHandler) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	txID, err := uuid.Parse(r.PathValue("txId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid transaction id")
		return
	}

	if err := h.budgetService.DeleteTransaction(ctx, info.GroupID, txID); err != nil {
		responseHandler.ErrorResponse(err, "delete transaction")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
