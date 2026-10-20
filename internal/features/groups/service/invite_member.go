package group_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func (s *GroupService) InviteMember(
	ctx context.Context,
	requesterID, groupID uuid.UUID,
	phone string,
) error {
	m, err := s.groups.GetMembership(ctx, requesterID, groupID)
	if err != nil {
		return fmt.Errorf("check requester membership: %w", err)
	}
	if m.Role != domain.GroupRoleAdmin || m.Status != domain.MembershipStatusActive {
		return core_errors.ErrNotGroupAdmin
	}

	user, err := s.users.FindByPhone(ctx, phone)
	if err != nil {
		return fmt.Errorf("find user by phone: %w", err)
	}

	if err := s.groups.InviteMember(ctx, user.ID, groupID, requesterID); err != nil {
		return fmt.Errorf("invite member: %w", err)
	}

	// Асинхронный push в Telegram. Без блокировки основного запроса.
	go s.notifyInvitation(context.WithoutCancel(ctx), user.ID, requesterID, groupID)

	return nil
}
