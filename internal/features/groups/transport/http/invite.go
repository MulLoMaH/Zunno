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

type InviteRequest struct {
	PhoneNumber string `json:"phone_number"`
}

func (h *GroupsHTTPHandler) Invite(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	requesterID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id")
		return
	}

	groupID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid group id")
		return
	}

	var req InviteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.groupService.InviteMember(ctx, requesterID, groupID, req.PhoneNumber); err != nil {
		responseHandler.ErrorResponse(err, "invite member")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
