package user_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_pwd "github.com/MulLoMaH/Zunno/internal/core/pwd"
	"github.com/google/uuid"
)

func (s *UserService) DeleteMe(ctx context.Context, userID uuid.UUID, password string) error {
	user, err := s.UsersRepository.GetUser(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	// GetUser не возвращает PasswordHash — нужен отдельный запрос
	fullUser, err := s.UsersRepository.FindByPhone(ctx, user.PhoneNumber)
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}

	if err := core_pwd.VerifyPassword(fullUser.PasswordHash, password); err != nil {
		return core_errors.ErrInvalidCredentials
	}

	if err := s.UsersRepository.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	return nil
}
