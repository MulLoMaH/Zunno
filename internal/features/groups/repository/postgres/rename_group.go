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

func (r *GroupsRepository) RenameGroup(
	ctx context.Context,
	groupID uuid.UUID,
	newName string,
	expectedVersion int64,
) (domain.Group, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.groups
		SET name = $1, version = version + 1
		WHERE id = $2 AND version = $3
		RETURNING id, version, name, owner_id, created_at
	`

	var gm GroupModel
	err := r.pool.QueryRow(ctx, query, newName, groupID, expectedVersion).Scan(
		&gm.ID, &gm.Version, &gm.Name, &gm.OwnerID, &gm.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Group{}, core_errors.ErrConflict
		}
		return domain.Group{}, fmt.Errorf("rename group: %w", err)
	}

	return groupFromModel(gm), nil
}
