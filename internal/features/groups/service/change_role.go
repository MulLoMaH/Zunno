package group_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) ChangeRole(ctx context.Context, requesterID, groupID, targetUserID uuid.UUID, newRole string) error {
	if newRole != "admin" && newRole != "member" {
		return core_errors.ErrInvalidArgument
	}

	m, err := s.groups.GetMembership(ctx, requesterID, groupID)
	if err != nil {
		return fmt.Errorf("check requester: %w", err)
	}
	if m.Role != "admin" {
		return core_errors.ErrNotGroupAdmin
	}

	return s.groups.ChangeRole(ctx, groupID, targetUserID, newRole)
}
