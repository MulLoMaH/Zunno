package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (r *UsersRepository) FindByPhone(ctx context.Context, phone string) (domain.User, error) {
	const query = `
		SELECT id, version, full_name, age, phone_number, password_hash, created_at
		FROM zunno.users
		WHERE phone_number = $1
	`

	var u domain.User
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&u.ID,
		&u.Version,
		&u.FullName,
		&u.Age,
		&u.PhoneNumber,
		&u.PasswordHash,
		&u.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, core_errors.ErrUserNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("find user by phone: %w", err)
	}

	return u, nil
}
