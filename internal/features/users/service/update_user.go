package user_service

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"

	"github.com/google/uuid"
)

type UpdateUserInput struct {
	FullName    string
	Age         int
	PhoneNumber string
	Version     int64
}

func (s *UserService) UpdateMe(
	ctx context.Context,
	userID uuid.UUID,
	in UpdateUserInput,
) (domain.User, error) {
	user := domain.User{
		ID:          userID,
		FullName:    in.FullName,
		Age:         in.Age,
		PhoneNumber: in.PhoneNumber,
	}

	if err := user.ValidateProfile(); err != nil {
		return domain.User{}, fmt.Errorf("validate profile: %w", err)
	}

	updated, err := s.UsersRepository.UpdateUser(ctx, user, in.Version)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrUniqueViolation) {
			return domain.User{}, core_errors.ErrPhoneTaken
		}
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.User{}, core_errors.ErrConflict
		}
		return domain.User{}, fmt.Errorf("update user: %w", err)
	}

	return updated, nil
}
