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

type RenameGroupRequest struct {
	Name    string `json:"name"`
	Version int64  `json:"version"`
}

func (h *GroupsHTTPHandler) RenameGroup(w http.ResponseWriter, r *http.Request) {
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

	var req RenameGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	updated, err := h.groupService.RenameGroup(ctx, requesterID, info.GroupID, req.Name, req.Version)
	if err != nil {
		responseHandler.ErrorResponse(err, "rename group")
		return
	}

	responseHandler.JSONResponse(groupDTOFromDomain(updated), http.StatusOK)
}
