package group_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) RenameGroup(
	ctx context.Context,
	requesterID, groupID uuid.UUID,
	newName string,
	expectedVersion int64,
) (domain.Group, error) {
	nameLen := len([]rune(newName))
	if nameLen < 1 || nameLen > 100 {
		return domain.Group{}, fmt.Errorf("group name length: %w", core_errors.ErrInvalidArgument)
	}

	m, err := s.groups.GetMembership(ctx, requesterID, groupID)
	if err != nil {
		return domain.Group{}, fmt.Errorf("check requester membership: %w", err)
	}
	if m.Role != domain.GroupRoleAdmin {
		return domain.Group{}, core_errors.ErrNotGroupAdmin
	}

	updated, err := s.groups.RenameGroup(ctx, groupID, newName, expectedVersion)
	if err != nil {
		return domain.Group{}, fmt.Errorf("rename group: %w", err)
	}
	return updated, nil
}
