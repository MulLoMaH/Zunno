package budget_service

import (
	"context"
	"fmt"

	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
	"github.com/google/uuid"
)

func (s *BudgetService) GetAnalytics(
	ctx context.Context,
	groupID uuid.UUID,
) ([]budget_postgres_repository.AnalyticsItem, error) {
	stats, err := s.budget.GetAnalytics(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("get analytics: %w", err)
	}
	return stats, nil
}
