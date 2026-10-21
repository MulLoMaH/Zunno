package group_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (s *GroupService) GetUserInvitations(ctx context.Context, userID uuid.UUID) ([]domain.Invitation, error) {
	invites, err := s.groups.GetUserInvitations(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user invitations: %w", err)
	}
	return invites, nil
}

func (s *GroupService) DeclineInvitation(ctx context.Context, userID, groupID uuid.UUID) error {
	if err := s.groups.DeclineInvitation(ctx, userID, groupID); err != nil {
		return fmt.Errorf("decline invitation: %w", err)
	}
	return nil
}
