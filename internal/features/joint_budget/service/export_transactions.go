package budget_service

import (
	"context"
	"fmt"

	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
	"github.com/google/uuid"
)

func (s *BudgetService) ExportTransactions(
	ctx context.Context,
	groupID uuid.UUID,
) ([]budget_postgres_repository.ExportTransactionRow, error) {
	rows, err := s.budget.ExportTransactions(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("export transactions: %w", err)
	}
	return rows, nil
}
