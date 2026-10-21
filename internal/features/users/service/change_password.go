package user_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_pwd "github.com/MulLoMaH/Zunno/internal/core/pwd"
	"github.com/google/uuid"
)

func (s *UserService) ChangePassword(ctx context.Context, userID uuid.UUID, oldPwd, newPwd string) error {
	if len(newPwd) < 8 || len(newPwd) > 72 {
		return fmt.Errorf("new password length must be 8-72: %w", core_errors.ErrInvalidArgument)
	}

	user, err := s.UsersRepository.GetUser(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	// Получаем полного юзера с хешем
	fullUser, err := s.UsersRepository.FindByPhone(ctx, user.PhoneNumber)
	if err != nil {
		return fmt.Errorf("find user: %w", err)
	}

	if err := core_pwd.VerifyPassword(fullUser.PasswordHash, oldPwd); err != nil {
		return core_errors.ErrInvalidCredentials
	}

	newHash, err := core_pwd.HashPassword(newPwd)
	if err != nil {
		return fmt.Errorf("hash new password: %w", err)
	}

	if err := s.UsersRepository.UpdatePasswordHash(ctx, userID, newHash); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	return nil
}
