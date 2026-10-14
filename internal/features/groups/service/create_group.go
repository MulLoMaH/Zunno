package group_service

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) CreateGroup(
	ctx context.Context,
	ownerID uuid.UUID,
	name string,
) (domain.Group, error) {
	nameLen := len([]rune(name))
	if nameLen < 1 || nameLen > 100 {
		return domain.Group{}, fmt.Errorf("group name length: %w", core_errors.ErrInvalidArgument)
	}

	group := domain.Group{
		ID:        uuid.New(),
		Version:   1,
		Name:      name,
		OwnerID:   ownerID,
		CreatedAt: time.Now(),
	}

	created, err := s.groups.CreateGroup(ctx, group)
	if err != nil {
		return domain.Group{}, fmt.Errorf("create group: %w", err)
	}
	return created, nil
}
