package group_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *GroupsHTTPHandler) Join(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id")
		return
	}

	groupID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid group id")
		return
	}

	if err := h.groupService.JoinGroup(ctx, userID, groupID); err != nil {
		responseHandler.ErrorResponse(err, "join group")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
