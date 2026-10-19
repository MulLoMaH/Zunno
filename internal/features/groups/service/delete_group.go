package group_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) DeleteGroup(ctx context.Context, requesterID, groupID uuid.UUID) error {
	g, err := s.groups.GetGroup(ctx, groupID)
	if err != nil {
		return fmt.Errorf("get group: %w", err)
	}

	if g.OwnerID != requesterID {
		return core_errors.ErrNotGroupAdmin // только owner может удалить
	}

	return s.groups.DeleteGroup(ctx, groupID, requesterID)
}
