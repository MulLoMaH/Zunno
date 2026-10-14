package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *GroupsRepository) GetUserGroups(ctx context.Context, userID uuid.UUID) ([]domain.Group, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT g.id, g.version, g.name, g.owner_id, g.created_at
		FROM zunno.groups g
		JOIN zunno.memberships m ON m.group_id = g.id
		WHERE m.user_id = $1 AND m.status = 'active'
		ORDER BY g.created_at DESC
	`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user groups: %w", err)
	}
	defer rows.Close()

	var groups []domain.Group
	for rows.Next() {
		var gm GroupModel
		if err := rows.Scan(&gm.ID, &gm.Version, &gm.Name, &gm.OwnerID, &gm.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}
		groups = append(groups, groupFromModel(gm))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate groups: %w", err)
	}

	return groups, nil
}
