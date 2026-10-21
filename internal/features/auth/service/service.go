package auth_service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type AuthService struct {
	users   userService
	groups  groupService
	tokens  tokenManager
	refresh refreshRepo
}

func NewAuthService(
	users userService,
	groups groupService,
	tokens tokenManager,
	refresh refreshRepo,
) *AuthService {
	return &AuthService{
		users:   users,
		groups:  groups,
		tokens:  tokens,
		refresh: refresh,
	}
}

type groupService interface {
	CreateGroup(ctx context.Context, ownerID uuid.UUID, name string) (domain.Group, error)
}

type userService interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	FindByPhone(ctx context.Context, phoneNumber string) (domain.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (domain.User, error)
}

type tokenManager interface {
	Issue(user domain.User) (access, refresh, jti string, err error)
	ParseRefresh(raw string) (domain.RefreshClaims, error)
	AccessTTL() time.Duration
	RefreshTTL() time.Duration
}

type refreshRepo interface {
	Save(ctx context.Context, jti, userID string, ttl time.Duration) error
	GetUserID(ctx context.Context, jti string) (string, error)
	Delete(ctx context.Context, jti string) error
	DeleteAllForUser(ctx context.Context, userID string) error
}
