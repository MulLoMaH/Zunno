package auth_transport_http

import (
	"encoding/json"
	"net/http"

	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"

	auth_service "github.com/MulLoMaH/Zunno/internal/features/auth/service"
)

func (h *AuthHTTPHandler) Login(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(err, "decode request")
		return
	}

	result, err := h.authService.Login(ctx, auth_service.LoginInput{
		PhoneNumber: req.PhoneNumber,
		Password:    req.Password,
	})
	if err != nil {
		responseHandler.ErrorResponse(err, "login")
		return
	}

	h.setRefreshCookie(w, result.Tokens.RefreshToken)

	responseHandler.JSONResponse(AuthResponse{
		AccessToken: result.Tokens.AccessToken,
		ExpiresIn:   result.Tokens.ExpiresIn,
		User:        userResponseFromDomain(result.User),
	}, http.StatusOK)
}
