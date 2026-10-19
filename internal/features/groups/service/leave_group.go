package group_service

import (
	"context"
	"fmt"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error {
	m, err := s.groups.GetMembership(ctx, userID, groupID)
	if err != nil {
		return fmt.Errorf("check membership: %w", err)
	}

	// Если админ, проверяем, есть ли другие админы
	if m.Role == "admin" {
		members, err := s.groups.GetGroupMembers(ctx, groupID)
		if err != nil {
			return fmt.Errorf("get members: %w", err)
		}
		adminCount := 0
		for _, member := range members {
			if member.Role == "admin" && member.UserID != userID {
				adminCount++
			}
		}
		if adminCount == 0 {
			return fmt.Errorf("last admin cannot leave: %w", core_errors.ErrInvalidArgument)
		}
	}

	return s.groups.LeaveGroup(ctx, userID, groupID)
}
