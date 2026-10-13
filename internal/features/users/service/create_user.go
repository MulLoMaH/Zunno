package user_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_pwd "github.com/MulLoMaH/Zunno/internal/core/pwd"
)

func (s *UserService) CreateUser(ctx context.Context, user domain.User) (domain.User, error) {
	if err := user.Validate(); err != nil {
		return domain.User{}, fmt.Errorf("validate user: %w", err)
	}

	userPwd, err := core_pwd.HashPassword(user.PasswordHash)
	if err != nil {
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	user.PasswordHash = userPwd

	userDomain, err := s.UsersRepository.CreateUser(ctx, user)
	if err != nil {
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	return userDomain, nil
}
