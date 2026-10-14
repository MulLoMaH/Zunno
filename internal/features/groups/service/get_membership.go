package group_service

import (
	"context"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (s *GroupService) GetMembership(
	ctx context.Context,
	userID, groupID uuid.UUID,
) (domain.Membership, error) {
	return s.groups.GetMembership(ctx, userID, groupID)
}
