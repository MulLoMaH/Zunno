package goal_transport_http

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type SetDueDateRequest struct {
	// DueDate = null → снимаем дедлайн.
	// DueDate = "2026-12-31T23:59:59Z" → ставим.
	DueDate *time.Time `json:"due_date"`
}

// SetDueDate — PUT /groups/{id}/goal-categories/{catId}/due
func (h *GoalsHTTPHandler) SetDueDate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	catID, err := uuid.Parse(r.PathValue("catId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid category id")
		return
	}

	var req SetDueDateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	cat, err := h.goalService.SetGoalCategoryDueDate(ctx, info.GroupID, catID, req.DueDate)
	if err != nil {
		responseHandler.ErrorResponse(err, "set due date")
		return
	}

	responseHandler.JSONResponse(categoryDTOFromDomain(cat), http.StatusOK)
}
