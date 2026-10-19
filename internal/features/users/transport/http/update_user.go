package user_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	user_service "github.com/MulLoMaH/Zunno/internal/features/users/service"
	"github.com/google/uuid"
)

type UpdateMeRequest struct {
	FullName    string `json:"full_name"`
	Age         int    `json:"age"`
	PhoneNumber string `json:"phone_number"`
	Currency    string `json:"currency"`
	Version     int64  `json:"version"`
}

type UpdateMeResponse UserDTOResponse

func (h *UsersHTTPHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims in context")
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id in claims")
		return
	}

	var req UpdateMeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	user, err := h.userService.UpdateMe(ctx, userID, user_service.UpdateUserInput{
		FullName:    req.FullName,
		Age:         req.Age,
		PhoneNumber: req.PhoneNumber,
		Currency:    req.Currency,
		Version:     req.Version,
	})
	if err != nil {
		responseHandler.ErrorResponse(err, "update me")
		return
	}

	responseHandler.JSONResponse(UpdateMeResponse(userDTOFromDomain(user)), http.StatusOK)
}
