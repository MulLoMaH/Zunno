package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (r *GroupsRepository) GetUserInvitations(ctx context.Context, userID uuid.UUID) ([]domain.Invitation, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT g.id, g.name, m.role
		FROM zunno.memberships m
		JOIN zunno.groups g ON g.id = m.group_id
		WHERE m.user_id = $1 AND m.status = 'pending'
		ORDER BY g.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query invitations: %w", err)
	}
	defer rows.Close()

	var invites []domain.Invitation
	for rows.Next() {
		var i domain.Invitation
		if err := rows.Scan(&i.GroupID, &i.GroupName, &i.Role); err != nil {
			return nil, fmt.Errorf("scan invitation: %w", err)
		}
		invites = append(invites, i)
	}
	return invites, nil
}

func (r *GroupsRepository) DeclineInvitation(ctx context.Context, userID, groupID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.memberships WHERE user_id = $1 AND group_id = $2 AND status = 'pending'`, userID, groupID)
	if err != nil {
		return fmt.Errorf("decline invitation: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrInviteNotFound
	}
	return nil
}
