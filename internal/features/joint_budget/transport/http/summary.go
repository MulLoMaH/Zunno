package budget_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *BudgetHTTPHandler) GetBudgetSummary(w http.ResponseWriter, r *http.Request) {
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

	sum, err := h.budgetService.GetBudgetSummary(ctx, info.GroupID, month)
	if err != nil {
		responseHandler.ErrorResponse(err, "get summary")
		return
	}

	resp := BudgetSummaryDTOResponse{
		GroupID:    sum.GroupID,
		Month:      sum.Month,
		TotalSpent: sum.TotalSpent,
		TotalLimit: sum.TotalLimit,
	}
	for _, it := range sum.Categories {
		resp.Categories = append(resp.Categories, BudgetSummaryItemDTOResponse{
			CategoryID: it.CategoryID,
			Name:       it.Name,
			Type:       it.Type,
			Limit:      it.Limit,
			Spent:      it.Spent,
			Overspent:  it.Overspent,
		})
	}
	responseHandler.JSONResponse(resp, http.StatusOK)
}

func (h *BudgetHTTPHandler) GetStatistics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	q := r.URL.Query()
	month := q.Get("month")
	if month == "" {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "month is required")
		return
	}

	var userID *uuid.UUID
	if v := q.Get("user_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			userID = &id
		}
	}

	stats, err := h.budgetService.GetStatistics(ctx, info.GroupID, month, userID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get statistics")
		return
	}
	responseHandler.JSONResponse(statsDTOsFromDomains(stats), http.StatusOK)
}
