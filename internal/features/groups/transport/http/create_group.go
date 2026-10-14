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

type CreateGroupRequest struct {
	Name string `json:"name"`
}

func (h *GroupsHTTPHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	ownerID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id")
		return
	}

	var req CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	group, err := h.groupService.CreateGroup(ctx, ownerID, req.Name)
	if err != nil {
		responseHandler.ErrorResponse(err, "create group")
		return
	}

	responseHandler.JSONResponse(groupDTOFromDomain(group), http.StatusCreated)
}
