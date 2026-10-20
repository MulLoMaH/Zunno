package group_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *GroupsHTTPHandler) LeaveGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	requesterID, _ := uuid.Parse(claims.UserID)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	if err := h.groupService.LeaveGroup(ctx, requesterID, info.GroupID); err != nil {
		responseHandler.ErrorResponse(err, "leave group")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupsHTTPHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	requesterID, _ := uuid.Parse(claims.UserID)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	if err := h.groupService.DeleteGroup(ctx, requesterID, info.GroupID); err != nil {
		responseHandler.ErrorResponse(err, "delete group")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupsHTTPHandler) KickMember(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	requesterID, _ := uuid.Parse(claims.UserID)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	targetUserID, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid user id")
		return
	}

	if err := h.groupService.KickMember(ctx, requesterID, info.GroupID, targetUserID); err != nil {
		responseHandler.ErrorResponse(err, "kick member")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *GroupsHTTPHandler) ChangeRole(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	requesterID, _ := uuid.Parse(claims.UserID)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	targetUserID, err := uuid.Parse(r.PathValue("userId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid user id")
		return
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.groupService.ChangeRole(ctx, requesterID, info.GroupID, targetUserID, req.Role); err != nil {
		responseHandler.ErrorResponse(err, "change role")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
