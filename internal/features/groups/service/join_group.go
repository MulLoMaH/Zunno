package group_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *GroupService) JoinGroup(
	ctx context.Context,
	userID, groupID uuid.UUID,
) error {
	if err := s.groups.JoinGroup(ctx, userID, groupID); err != nil {
		return fmt.Errorf("join group: %w", err)
	}
	return nil
}
