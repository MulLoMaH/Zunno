package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/jackc/pgx/v5"
)

func (r *UsersRepository) UpdateUser(
	ctx context.Context,
	user domain.User,
	expectedVersion int64,
) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.users
		SET full_name     = $1,
		    age           = $2,
		    phone_number  = $3,
		    version       = version + 1
		WHERE id = $5 AND version = $6
		RETURNING id, version, full_name, age, phone_number, created_at
	`

	row := r.pool.QueryRow(ctx, query,
		user.FullName,
		user.Age,
		user.PhoneNumber,
		user.ID,
		expectedVersion,
	)

	var userModel UserModel
	err := row.Scan(
		&userModel.ID,
		&userModel.Version,
		&userModel.FullName,
		&userModel.Age,
		&userModel.PhoneNumber,
		&userModel.CreatedAt,
	)
	if err != nil {
		// unique_violation на phone_number — 409
		var sqlStateErr interface{ SQLState() string }
		if errors.As(err, &sqlStateErr) && sqlStateErr.SQLState() == "23505" {
			return domain.User{}, core_errors.ErrPhoneTaken
		}
		// ErrNoRows — версия не совпала (кто-то уже обновил запись)
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, core_errors.ErrConflict
		}
		return domain.User{}, fmt.Errorf("update user: %w", err)
	}

	return domain.NewUserResponse(
		userModel.ID,
		userModel.Version,
		userModel.FullName,
		userModel.Age,
		userModel.PhoneNumber,
		userModel.CreatedAt,
	), nil
}
