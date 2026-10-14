package groups_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

func (r *GroupsRepository) CreateGroup(
	ctx context.Context,
	group domain.Group,
) (domain.Group, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Group{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) // no-op после Commit

	// 1. INSERT group
	insertGroup := `
		INSERT INTO zunno.groups (name, owner_id)
		VALUES ($1, $2)
		RETURNING id, version, name, owner_id, created_at
	`
	var gm GroupModel
	err = tx.QueryRow(ctx, insertGroup, group.Name, group.OwnerID).Scan(
		&gm.ID,
		&gm.Version,
		&gm.Name,
		&gm.OwnerID,
		&gm.CreatedAt,
	)
	if err != nil {
		return domain.Group{}, fmt.Errorf("insert group: %w", err)
	}

	// 2. INSERT admin membership
	insertMembership := `
		INSERT INTO zunno.memberships (user_id, group_id, role, status)
		VALUES ($1, $2, $3, $4)
	`
	_, err = tx.Exec(ctx, insertMembership,
		group.OwnerID,
		gm.ID,
		domain.GroupRoleAdmin,
		domain.MembershipStatusActive,
	)
	if err != nil {
		return domain.Group{}, fmt.Errorf("insert admin membership: %w", err)
	}

	// 3. Commit
	if err := tx.Commit(ctx); err != nil {
		return domain.Group{}, fmt.Errorf("commit tx: %w", err)
	}

	return groupFromModel(gm), nil
}
