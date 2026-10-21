package group_transport_http

import (
	"net/http"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type InvitationDTOResponse struct {
	GroupID     uuid.UUID `json:"group_id"`
	GroupName   string    `json:"group_name"`
	Role        string    `json:"role"`
	InviterName string    `json:"inviter_name"`
	CreatedAt   string    `json:"created_at"`
}

func (h *GroupsHTTPHandler) GetInvitations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	userID, _ := uuid.Parse(claims.UserID)

	invites, err := h.groupService.GetUserInvitations(ctx, userID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get invitations")
		return
	}

	res := make([]InvitationDTOResponse, len(invites))
	for i, inv := range invites {
		res[i] = InvitationDTOResponse{GroupID: inv.GroupID, GroupName: inv.GroupName, Role: inv.Role, InviterName: inv.InviterName, CreatedAt: inv.CreatedAt.Format(time.RFC3339)}
	}
	responseHandler.JSONResponse(res, http.StatusOK)
}

func (h *GroupsHTTPHandler) DeclineInvitation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	userID, _ := uuid.Parse(claims.UserID)

	groupID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid group id")
		return
	}

	if err := h.groupService.DeclineInvitation(ctx, userID, groupID); err != nil {
		responseHandler.ErrorResponse(err, "decline invitation")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
