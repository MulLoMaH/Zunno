package groups_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *GroupsRepository) LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.memberships WHERE user_id = $1 AND group_id = $2`, userID, groupID)
	if err != nil {
		return fmt.Errorf("leave group: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrNotGroupMember
	}
	return nil
}
