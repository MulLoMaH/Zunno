package budget_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (s *BudgetService) GetMembersSpent(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
) ([]domain.MemberSpent, error) {
	from, to, err := monthRange(month)
	if err != nil {
		return nil, err
	}

	members, err := s.budget.GetMembersSpent(ctx, groupID, from, to)
	if err != nil {
		return nil, fmt.Errorf("get members spent: %w", err)
	}
	return members, nil
}
