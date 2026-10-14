package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *GroupsRepository) GetGroupMembers(
	ctx context.Context,
	groupID uuid.UUID,
) ([]domain.Membership, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT user_id, group_id, role, status, joined_at
		FROM zunno.memberships
		WHERE group_id = $1 AND status = 'active'
		ORDER BY joined_at ASC
	`

	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query members: %w", err)
	}
	defer rows.Close()

	var members []domain.Membership
	for rows.Next() {
		var mm MembershipModel
		if err := rows.Scan(&mm.UserID, &mm.GroupID, &mm.Role, &mm.Status, &mm.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan membership: %w", err)
		}
		members = append(members, membershipFromModel(mm))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate members: %w", err)
	}

	return members, nil
}
