package group_transport_http

import (
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *GroupsHTTPHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
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

	groups, err := h.groupService.GetUserGroups(ctx, userID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get groups")
		return
	}

	responseHandler.JSONResponse(groupsDTOsFromDomains(groups), http.StatusOK)
}

func (h *GroupsHTTPHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	claims, ok := core_http_middleware.ClaimsFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims in context")
		return
	}

	requesterID, err := uuid.Parse(claims.UserID)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id in claims")
		return
	}

	// Получаем ID группы из контекста (middleware GroupContext уже проверил доступ)
	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info in context")
		return
	}

	members, err := h.groupService.GetGroupMembers(ctx, requesterID, info.GroupID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get members")
		return
	}

	// Вот тут используем новую функцию
	responseHandler.JSONResponse(membersDTOsFromDomains(members), http.StatusOK)
}
