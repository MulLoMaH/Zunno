package groups_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *GroupsRepository) ChangeRole(ctx context.Context, groupID, targetUserID uuid.UUID, newRole string) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `UPDATE zunno.memberships SET role = $1 WHERE user_id = $2 AND group_id = $3`, newRole, targetUserID, groupID)
	if err != nil {
		return fmt.Errorf("change role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrNotGroupMember
	}
	return nil
}
