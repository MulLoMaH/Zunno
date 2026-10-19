package group_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) KickMember(ctx context.Context, requesterID, groupID, targetUserID uuid.UUID) error {
	m, err := s.groups.GetMembership(ctx, requesterID, groupID)
	if err != nil {
		return fmt.Errorf("check requester: %w", err)
	}
	if m.Role != "admin" {
		return core_errors.ErrNotGroupAdmin
	}

	// Нельзя кикнуть владельца
	g, err := s.groups.GetGroup(ctx, groupID)
	if err != nil {
		return fmt.Errorf("get group: %w", err)
	}
	if g.OwnerID == targetUserID {
		return core_errors.ErrInvalidArgument
	}

	return s.groups.KickMember(ctx, requesterID, groupID, targetUserID)
}
