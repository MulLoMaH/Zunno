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

func (r *GroupsRepository) GetGroup(ctx context.Context, id uuid.UUID) (domain.Group, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, name, owner_id, created_at
		FROM zunno.groups
		WHERE id = $1
	`

	var gm GroupModel
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&gm.ID, &gm.Version, &gm.Name, &gm.OwnerID, &gm.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Group{}, core_errors.ErrGroupNotFound
		}
		return domain.Group{}, fmt.Errorf("get group: %w", err)
	}

	return groupFromModel(gm), nil
}
