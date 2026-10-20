package plan_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type CommentRequest struct {
	Text string `json:"text"`
}

func (h *PlansHTTPHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, _ := uuid.Parse(r.PathValue("planId"))

	var req CommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	comment, err := h.planService.CreateComment(ctx, info.GroupID, planID, info.UserID, req.Text)
	if err != nil {
		responseHandler.ErrorResponse(err, "create comment")
		return
	}
	responseHandler.JSONResponse(comment, http.StatusCreated)
}

func (h *PlansHTTPHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, _ := uuid.Parse(r.PathValue("planId"))

	comments, err := h.planService.GetComments(ctx, info.GroupID, planID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get comments")
		return
	}
	responseHandler.JSONResponse(comments, http.StatusOK)
}
