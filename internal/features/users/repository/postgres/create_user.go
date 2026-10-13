package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (r *UsersRepository) CreateUser(ctx context.Context, user domain.User) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	INSERT INTO zunno.users (full_name, age, phone_number, password_hash)
	VALUES ($1, $2, $3, $4)
	RETURNING id, version, full_name, age, phone_number, created_at
`

	row := r.pool.QueryRow(ctx, query, user.FullName, user.Age, user.PhoneNumber, user.PasswordHash)

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
		var sqlStateErr interface{ SQLState() string }
		if errors.As(err, &sqlStateErr) && sqlStateErr.SQLState() == "23505" {
			return domain.User{}, core_errors.ErrPhoneTaken
		}
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	userDomain := domain.NewUserResponse(
		userModel.ID,
		userModel.Version,
		user.FullName,
		user.Age,
		userModel.PhoneNumber,
		userModel.CreatedAt,
	)

	return userDomain, nil
}
