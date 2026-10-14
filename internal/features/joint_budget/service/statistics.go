package budget_service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
)

func (s *BudgetService) GetStatistics(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
	userID *uuid.UUID,
) ([]domain.CategoryStats, error) {
	if len(month) != 7 || month[4] != '-' {
		return nil, fmt.Errorf("month must be YYYY-MM: %w", core_errors.ErrInvalidArgument)
	}

	stats, err := s.budget.GetCategoryStats(ctx, groupID, month, userID)
	if err != nil {
		return nil, fmt.Errorf("get stats: %w", err)
	}

	if len(stats) > 0 {
		return stats, nil
	}

	// Fallback: считаем on-the-fly из transactions.
	// Kafka-консьюмер продолжит наполнять category_stats в фоне.
	return s.computeStatsOnTheFly(ctx, groupID, month, userID)
}

func (s *BudgetService) computeStatsOnTheFly(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
	userID *uuid.UUID,
) ([]domain.CategoryStats, error) {
	from, to, err := monthRange(month)
	if err != nil {
		return nil, err
	}

	txs, err := s.budget.GetTransactions(ctx, budget_postgres_repository.TransactionsFilter{
		GroupID: groupID,
		From:    &from,
		To:      &to,
		UserID:  userID,
	})
	if err != nil {
		return nil, fmt.Errorf("get transactions for stats: %w", err)
	}

	type key struct {
		userID     uuid.UUID
		categoryID uuid.UUID
	}
	agg := map[key]float64{}
	for _, t := range txs {
		k := key{userID: t.UserID, categoryID: t.CategoryID}
		agg[k] += t.Amount
	}

	out := make([]domain.CategoryStats, 0, len(agg))
	now := time.Now()
	for k, total := range agg {
		out = append(out, domain.CategoryStats{
			GroupID:     groupID,
			UserID:      k.userID,
			CategoryID:  k.categoryID,
			Month:       month,
			TotalAmount: total,
			UpdatedAt:   now,
		})
	}
	return out, nil
}

// BudgetSummary — как в ТЗ, но пока без категорий: просто агрегат.
func (s *BudgetService) GetBudgetSummary(
	ctx context.Context,
	groupID uuid.UUID,
	month string,
) (domain.BudgetSummary, error) {
	if len(month) != 7 || month[4] != '-' {
		return domain.BudgetSummary{}, fmt.Errorf("month must be YYYY-MM: %w", core_errors.ErrInvalidArgument)
	}

	from, to, err := monthRange(month)
	if err != nil {
		return domain.BudgetSummary{}, err
	}

	cats, err := s.budget.GetCategories(ctx, groupID)
	if err != nil {
		return domain.BudgetSummary{}, fmt.Errorf("get categories: %w", err)
	}

	summary := domain.BudgetSummary{
		GroupID: groupID,
		Month:   month,
	}
	for _, c := range cats {
		spent, err := s.budget.GetCategorySpent(ctx, c.ID, from, to)
		if err != nil {
			return domain.BudgetSummary{}, fmt.Errorf("spent for %s: %w", c.Name, err)
		}
		summary.TotalSpent += spent
		summary.TotalLimit += c.BudgetLimit
		summary.Categories = append(summary.Categories, domain.BudgetSummaryItem{
			CategoryID: c.ID,
			Name:       c.Name,
			Type:       c.Type,
			Limit:      c.BudgetLimit,
			Spent:      spent,
			Overspent:  c.BudgetLimit > 0 && spent > c.BudgetLimit,
		})
	}

	return summary, nil
}

func monthRange(month string) (from, to time.Time, err error) {
	t, err := time.Parse("2006-01", month)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("parse month: %w", core_errors.ErrInvalidArgument)
	}
	return t, t.AddDate(0, 1, 0), nil
}

var _ = errors.Is
