package core_http_middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type groupCtxKey string

const groupInfoKey groupCtxKey = "group_info"

// GroupInfo — то, что middleware кладёт в контекст.
type GroupInfo struct {
	GroupID uuid.UUID
	UserID  uuid.UUID
	Role    string
}

// То, что middleware ожидает от сервиса групп. Consumer-defined interface.
type GroupMembershipProvider interface {
	GetMembership(ctx context.Context, userID, groupID uuid.UUID) (domain.Membership, error)
}

// GroupContext — читает {id} из path (это groupID), проверяет,
// что юзер из claims — активный участник группы.
// Кладёт GroupInfo в контекст.
func GroupContext(provider GroupMembershipProvider) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log := core_logger.FromContext(r.Context())
			responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

			groupIDStr := r.PathValue("id")
			if groupIDStr == "" {
				responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "missing group id in path")
				return
			}

			groupID, err := uuid.Parse(groupIDStr)
			if err != nil {
				responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid group id")
				return
			}

			claims, ok := ClaimsFrom(r.Context())
			if !ok {
				responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "no claims in context")
				return
			}

			userID, err := uuid.Parse(claims.UserID)
			if err != nil {
				responseHandler.ErrorResponse(core_errors.ErrInvalidToken, "invalid user id in claims")
				return
			}

			m, err := provider.GetMembership(r.Context(), userID, groupID)
			if err != nil {
				responseHandler.ErrorResponse(core_errors.ErrNotGroupMember, "not a group member")
				return
			}
			if m.Status != domain.MembershipStatusActive {
				responseHandler.ErrorResponse(core_errors.ErrNotGroupMember, "membership is not active")
				return
			}

			info := GroupInfo{
				GroupID: groupID,
				UserID:  userID,
				Role:    m.Role,
			}
			ctx := context.WithValue(r.Context(), groupInfoKey, info)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GroupInfoFrom — достаётся в хендлере.
func GroupInfoFrom(ctx context.Context) (GroupInfo, bool) {
	info, ok := ctx.Value(groupInfoKey).(GroupInfo)
	return info, ok
}

// RequireGroupAdmin — навешивается ПОСЛЕ GroupContext.
// Проверяет, что роль в GroupInfo == admin.
func RequireGroupAdmin() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log := core_logger.FromContext(r.Context())
			responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

			info, ok := GroupInfoFrom(r.Context())
			if !ok {
				responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info in context")
				return
			}
			if info.Role != domain.GroupRoleAdmin {
				responseHandler.ErrorResponse(core_errors.ErrNotGroupAdmin, "not a group admin")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
