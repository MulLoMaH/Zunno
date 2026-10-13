package auth_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

func (h *AuthHTTPHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "missing refresh cookie")
		return
	}

	result, err := h.authService.Refresh(ctx, cookie.Value)
	if err != nil {
		responseHandler.ErrorResponse(err, "refresh")
		return
	}

	h.setRefreshCookie(w, result.Tokens.RefreshToken)

	responseHandler.JSONResponse(AuthResponse{
		AccessToken: result.Tokens.AccessToken,
		ExpiresIn:   result.Tokens.ExpiresIn,
		User:        userResponseFromDomain(result.User),
	}, http.StatusOK)
}
