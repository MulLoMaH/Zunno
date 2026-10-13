package user_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

func (s *UserService) FindByPhone(ctx context.Context, phoneNumber string) (domain.User, error) {
	user, err := s.UsersRepository.FindByPhone(ctx, phoneNumber)
	if err != nil {
		return domain.User{}, fmt.Errorf("find user by email: %w", err)
	}
	return user, nil
}
