package core_http_middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	tokenpkg "github.com/MulLoMaH/Zunno/internal/core/token"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type ctxKey string

const claimsKey ctxKey = "auth_claims"

func JWTAuth(m *tokenpkg.Manager) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log := core_logger.FromContext(r.Context())
			responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

			raw := extractBearer(r)
			if raw == "" {
				responseHandler.ErrorResponse(
					core_errors.ErrInvalidToken,
					"missing token",
				)
				return
			}

			claims, err := m.ParseAccess(raw)
			if err != nil {
				responseHandler.ErrorResponse(
					core_errors.ErrInvalidToken,
					"invalid token",
				)
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func extractBearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func ClaimsFrom(ctx context.Context) (domain.Claims, bool) {
	c, ok := ctx.Value(claimsKey).(domain.Claims)
	return c, ok
}

func RequireUserID(ctx context.Context) (string, error) {
	claims, ok := ClaimsFrom(ctx)
	if !ok || claims.UserID == "" {
		return "", core_errors.ErrInvalidToken
	}
	return claims.UserID, nil
}
