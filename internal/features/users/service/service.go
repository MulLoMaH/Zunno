package user_service

import (
	"context"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type UserService struct {
	UsersRepository UsersRepository
}

type UsersRepository interface {
	CreateUser(ctx context.Context, user domain.User) (domain.User, error)
	GetUsers(ctx context.Context, limit *int, offset *int) ([]domain.User, error)
	GetUser(ctx context.Context, id uuid.UUID) (domain.User, error)
	FindByPhone(ctx context.Context, phoneNumber string) (domain.User, error)
	UpdateUser(ctx context.Context, user domain.User, expectedVersion int64) (domain.User, error)
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

func NewUserService(UsersRepository UsersRepository) *UserService {
	return &UserService{
		UsersRepository: UsersRepository,
	}
}
