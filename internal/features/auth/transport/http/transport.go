package auth_transport_http

import (
	"context"
	"net/http"
	"time"

	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"

	auth_service "github.com/MulLoMaH/Zunno/internal/features/auth/service"
)

type AuthHTTPHandler struct {
	authService  AuthService
	refreshTTL   time.Duration
	cookieSecure bool
}

type AuthService interface {
	Register(ctx context.Context, in auth_service.RegisterInput) (auth_service.AuthResult, error)
	Login(ctx context.Context, in auth_service.LoginInput) (auth_service.AuthResult, error)
	Refresh(ctx context.Context, rawRefresh string) (auth_service.AuthResult, error)
	Logout(ctx context.Context, rawRefresh string) error
}

func NewAuthHTTPHandler(authService AuthService, refreshTTL time.Duration, cookieSecure bool) *AuthHTTPHandler {
	return &AuthHTTPHandler{
		authService:  authService,
		refreshTTL:   refreshTTL,
		cookieSecure: cookieSecure,
	}
}

func (h *AuthHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/auth/register",
			Handler: h.Register,
		},
		{
			Method:  http.MethodPost,
			Path:    "/auth/login",
			Handler: h.Login,
		},
		{
			Method:  http.MethodPost,
			Path:    "/auth/refresh",
			Handler: h.Refresh,
		},
		{
			Method:  http.MethodPost,
			Path:    "/auth/logout",
			Handler: h.Logout,
		},
	}
}
