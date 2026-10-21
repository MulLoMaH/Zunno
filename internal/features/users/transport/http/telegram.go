package user_transport_http

import (
	"net/http"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type TelegramLinkResponse struct {
	Code        string `json:"code"`
	ExpiresAt   string `json:"expires_at"`
	Instruction string `json:"instruction"`
}

// LinkTelegram — POST /users/me/telegram/link
// Генерирует одноразовый код привязки Telegram и возвращает его клиенту.
func (h *UsersHTTPHandler) LinkTelegram(w http.ResponseWriter, r *http.Request) {
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

	code, expiresAt, err := h.userService.GenerateTelegramLinkCode(ctx, userID)
	if err != nil {
		responseHandler.ErrorResponse(err, "generate telegram link code")
		return
	}

	responseHandler.JSONResponse(TelegramLinkResponse{
		Code:        code,
		ExpiresAt:   expiresAt.UTC().Format(time.RFC3339),
		Instruction: "Откройте Telegram-бота Zunno и отправьте команду: /start " + code,
	}, http.StatusOK)
}

// UnlinkTelegram — DELETE /users/me/telegram
// Отвязывает текущий Telegram chat_id от аккаунта.
func (h *UsersHTTPHandler) UnlinkTelegram(w http.ResponseWriter, r *http.Request) {
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

	if err := h.userService.UnlinkTelegram(ctx, userID); err != nil {
		responseHandler.ErrorResponse(err, "unlink telegram")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
