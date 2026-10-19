package budget_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *BudgetService) DeleteTransaction(ctx context.Context, groupID, txID uuid.UUID) error {
	if err := s.budget.DeleteTransaction(ctx, groupID, txID); err != nil {
		return fmt.Errorf("delete transaction: %w", err)
	}
	return nil
}
