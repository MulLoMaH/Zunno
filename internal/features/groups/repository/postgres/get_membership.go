package groups_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

func (r *GroupsRepository) GetMembership(
	ctx context.Context,
	userID, groupID uuid.UUID,
) (domain.Membership, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT user_id, group_id, role, status, joined_at
		FROM zunno.memberships
		WHERE user_id = $1 AND group_id = $2
	`

	var mm MembershipModel
	err := r.pool.QueryRow(ctx, query, userID, groupID).Scan(
		&mm.UserID, &mm.GroupID, &mm.Role, &mm.Status, &mm.JoinedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Membership{}, core_errors.ErrNotGroupMember
		}
		return domain.Membership{}, fmt.Errorf("get membership: %w", err)
	}

	return membershipFromModel(mm), nil
}
