package groups_postgres_repository

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *GroupsRepository) DeleteGroup(ctx context.Context, groupID, ownerID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.groups WHERE id = $1 AND owner_id = $2`, groupID, ownerID)
	if err != nil {
		return fmt.Errorf("delete group: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrGroupNotFound
	}
	return nil
}
