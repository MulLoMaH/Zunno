package auth_transport_http

import (
	"encoding/json"
	"net/http"

	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"

	auth_service "github.com/MulLoMaH/Zunno/internal/features/auth/service"
)

func (h *AuthHTTPHandler) Register(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(err, "decode request")
		return
	}

	result, err := h.authService.Register(ctx, auth_service.RegisterInput{
		PhoneNumber: req.PhoneNumber,
		Password:    req.Password,
		FullName:    req.FullName,
		Age:         req.Age,
	})
	if err != nil {
		responseHandler.ErrorResponse(err, "register")
		return
	}

	h.setRefreshCookie(w, result.Tokens.RefreshToken)

	responseHandler.JSONResponse(AuthResponse{
		AccessToken: result.Tokens.AccessToken,
		ExpiresIn:   result.Tokens.ExpiresIn,
		User:        userResponseFromDomain(result.User),
	}, http.StatusCreated)
}
