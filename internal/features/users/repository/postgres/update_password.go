package users_postgres_repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (r *UsersRepository) UpdatePasswordHash(ctx context.Context, userID uuid.UUID, newHash string) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.users SET password_hash = $1, version = version + 1 WHERE id = $2`
	tag, err := r.pool.Exec(ctx, query, newHash, userID)
	if err != nil {
		return fmt.Errorf("update password hash: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}
	return nil
}
