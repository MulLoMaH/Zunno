package budget_transport_http

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	budget_service "github.com/MulLoMaH/Zunno/internal/features/joint_budget/service"
)

type CreateTransactionRequest struct {
	CategoryID  uuid.UUID `json:"category_id"`
	Amount      float64   `json:"amount"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
}

func (h *BudgetHTTPHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	tx, err := h.budgetService.CreateTransaction(ctx, info.GroupID, info.UserID, budget_service.CreateTransactionInput{
		CategoryID:  req.CategoryID,
		Amount:      req.Amount,
		Date:        req.Date,
		Description: req.Description,
	})
	if err != nil {
		responseHandler.ErrorResponse(err, "create transaction")
		return
	}
	responseHandler.JSONResponse(transactionDTOFromDomain(tx), http.StatusCreated)
}

func (h *BudgetHTTPHandler) GetTransactions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	q := r.URL.Query()
	var f budget_service.GetTransactionsFilter

	if v := q.Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			f.From = &t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			f.To = &t
		}
	}
	if v := q.Get("category_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			f.CategoryID = &id
		}
	}
	if v := q.Get("user_id"); v != "" {
		if id, err := uuid.Parse(v); err == nil {
			f.UserID = &id
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			f.Offset = n
		}
	}

	txs, err := h.budgetService.GetTransactions(ctx, info.GroupID, f)
	if err != nil {
		responseHandler.ErrorResponse(err, "get transactions")
		return
	}
	responseHandler.JSONResponse(transactionsDTOsFromDomains(txs), http.StatusOK)
}

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
