package budget_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

func (h *BudgetHTTPHandler) GetMembersSpent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "month is required")
		return
	}

	stats, err := h.budgetService.GetMembersSpent(ctx, info.GroupID, month)
	if err != nil {
		responseHandler.ErrorResponse(err, "get members spent")
		return
	}

	responseHandler.JSONResponse(stats, http.StatusOK)
}
