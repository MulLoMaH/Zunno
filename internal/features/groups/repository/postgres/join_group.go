package groups_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *GroupsRepository) JoinGroup(
	ctx context.Context,
	userID, groupID uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.memberships
		SET status = 'active'
		WHERE user_id = $1 AND group_id = $2 AND status = 'pending'
	`

	tag, err := r.pool.Exec(ctx, query, userID, groupID)
	if err != nil {
		return fmt.Errorf("update membership: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return core_errors.ErrInviteNotFound
	}

	return nil
}
