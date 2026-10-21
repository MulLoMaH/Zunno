package users_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func (r *UsersRepository) UpdateUser(
	ctx context.Context,
	user domain.User,
	expectedVersion int64,
) (domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	// ФИКС: Добавлен ::varchar для $4, чтобы Postgres понимал тип
	query := `
		UPDATE zunno.users
		SET full_name     = $1,
		    age           = $2,
		    phone_number  = $3,
		    currency      = $4::varchar,
		    version       = version + 1
		WHERE id = $5 AND version = $6
		RETURNING id, version, full_name, age, phone_number, currency, created_at
	`

	row := r.pool.QueryRow(ctx, query,
		user.FullName,
		user.Age,
		user.PhoneNumber,
		user.Currency,
		user.ID,
		expectedVersion,
	)

	var u UserModel
	err := row.Scan(
		&u.ID,
		&u.Version,
		&u.FullName,
		&u.Age,
		&u.PhoneNumber,
		&u.Currency,
		&u.CreatedAt,
	)
	if err != nil {
		// Обработка уникального ключа (телефон уже занят)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.User{}, core_errors.ErrPhoneTaken
		}
		// Обработка несовпадения версии
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.User{}, core_errors.ErrConflict
		}
		return domain.User{}, fmt.Errorf("update user: %w", err)
	}

	return domain.User{
		ID:          u.ID,
		Version:     u.Version,
		FullName:    u.FullName,
		Age:         u.Age,
		PhoneNumber: u.PhoneNumber,
		Currency:    u.Currency,
		CreatedAt:   u.CreatedAt,
	}, nil
}
