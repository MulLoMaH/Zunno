package user_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *UsersHTTPHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims")
		return
	}
	userID, _ := uuid.Parse(claims.UserID)

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.userService.ChangePassword(ctx, userID, req.OldPassword, req.NewPassword); err != nil {
		responseHandler.ErrorResponse(err, "change password")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
