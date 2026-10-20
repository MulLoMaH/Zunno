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

func (r *GroupsRepository) InviteMember(
	ctx context.Context,
	userID, groupID, inviterID uuid.UUID,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.memberships (user_id, group_id, role, status, invited_by)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := r.pool.Exec(ctx, query,
		userID, groupID,
		domain.GroupRoleMember,
		domain.MembershipStatusPending,
		inviterID,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrUniqueViolation) {
			return core_errors.ErrAlreadyMember
		}
		return fmt.Errorf("insert membership: %w", err)
	}

	return nil
}
