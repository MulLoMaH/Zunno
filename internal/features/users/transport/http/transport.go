package user_transport_http

import (
	"context"
	"net/http"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	user_service "github.com/MulLoMaH/Zunno/internal/features/users/service"
	"github.com/google/uuid"
)

type UsersHTTPHandler struct {
	userService UserService
}

type UserService interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	GetUsers(ctx context.Context, limit *int, offset *int) ([]domain.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (domain.User, error)
	GetMe(ctx context.Context, userID uuid.UUID) (domain.User, error)
	UpdateMe(ctx context.Context, userID uuid.UUID, in user_service.UpdateUserInput) (domain.User, error)
	DeleteMe(ctx context.Context, userID uuid.UUID, password string) error
}

func NewUsersHTTPHandler(userService UserService) *UsersHTTPHandler {
	return &UsersHTTPHandler{
		userService: userService,
	}
}
func (h *UsersHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		// {
		// 	Method:  http.MethodPost,
		// 	Path:    "/users",
		// 	Handler: h.CreateUser,
		// },
		{
			Method:  http.MethodGet,
			Path:    "/users",
			Handler: h.GetUsers,
		},
		{
			Method:  http.MethodGet,
			Path:    "/users/{id}",
			Handler: h.GetUser,
		},
		{
			Method:  http.MethodGet,
			Path:    "/users/me",
			Handler: h.GetMe,
		},
		{
			Method:  http.MethodPatch,
			Path:    "/users/me",
			Handler: h.UpdateMe,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/users/me",
			Handler: h.DeleteMe,
		},
	}

}
