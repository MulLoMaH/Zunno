package group_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) GetUserGroups(
	ctx context.Context,
	userID uuid.UUID,
) ([]domain.Group, error) {
	groups, err := s.groups.GetUserGroups(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user groups: %w", err)
	}
	return groups, nil
}

func (s *GroupService) GetGroupMembers(
	ctx context.Context,
	requesterID, groupID uuid.UUID,
) ([]domain.GroupMember, error) {
	m, err := s.groups.GetMembership(ctx, requesterID, groupID)
	if err != nil {
		return nil, fmt.Errorf("check requester membership: %w", err)
	}
	if m.Status != domain.MembershipStatusActive {
		return nil, core_errors.ErrNotGroupMember
	}

	members, err := s.groups.GetGroupMembers(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("get group members: %w", err)
	}
	return members, nil
}
