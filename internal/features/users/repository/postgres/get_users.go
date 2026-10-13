package users_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

func (r *UsersRepository) GetUsers(ctx context.Context, limit *int, offset *int) ([]domain.User, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT id, version, full_name, age, phone_number, created_at
	FROM zunno.users
	ORDER BY id ASC
	LIMIT $1
	OFFSET $2
`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var userModels []UserModel
	for rows.Next() {
		var userModel UserModel
		if err := rows.Scan(
			&userModel.ID,
			&userModel.Version,
			&userModel.FullName,
			&userModel.Age,
			&userModel.PhoneNumber,
			&userModel.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		userModels = append(userModels, userModel)
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	userDomains := userDomainFromModels(userModels)

	return userDomains, nil
}
