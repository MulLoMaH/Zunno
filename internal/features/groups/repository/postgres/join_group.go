package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *GroupsRepository) JoinGroup(
	ctx context.Context,
	userID, groupID uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.memberships (user_id, group_id, role, status)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, group_id)
		DO UPDATE SET status = EXCLUDED.status
	`

	_, err := r.pool.Exec(ctx, query,
		userID,
		groupID,
		domain.GroupRoleMember,
		domain.MembershipStatusActive,
	)
	if err != nil {
		return fmt.Errorf("join group: %w", err)
	}
	return nil
}
