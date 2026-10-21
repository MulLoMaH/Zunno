package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *UsersRepository) GetUser(ctx context.Context, id uuid.UUID) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, full_name, age, phone_number, created_at, currency
		FROM zunno.users
		WHERE id = $1
	`

	row := r.pool.QueryRow(ctx, query, id)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.Version,
		&userModel.FullName,
		&userModel.Age,
		&userModel.PhoneNumber,
		&userModel.CreatedAt,
		&userModel.Currency,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, fmt.Errorf(
				"user with id='%s': %w",
				id,
				core_errors.ErrUserNotFound,
			)
		}
		return domain.User{}, fmt.Errorf("scan error: %w", err)
	}

	userDomain := domain.NewUserResponse(
		userModel.ID,
		userModel.Version,
		userModel.FullName,
		userModel.Age,
		userModel.PhoneNumber,
		userModel.CreatedAt,
	)

	return userDomain, nil
}
