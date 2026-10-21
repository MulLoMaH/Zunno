package goal_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type ReorderRequest struct {
	IDs []uuid.UUID `json:"ids"`
}

func (h *GoalsHTTPHandler) ReorderItems(w http.ResponseWriter, r *http.Request) {
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

	var req ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.goalService.ReorderGoalItems(ctx, info.GroupID, catID, req.IDs); err != nil {
		responseHandler.ErrorResponse(err, "reorder items")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GoalsHTTPHandler) ReorderCategories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req ReorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.goalService.ReorderGoalCategories(ctx, info.GroupID, req.IDs); err != nil {
		responseHandler.ErrorResponse(err, "reorder categories")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
