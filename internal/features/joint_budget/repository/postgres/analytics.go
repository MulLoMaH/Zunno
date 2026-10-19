package budget_postgres_repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type AnalyticsItem struct {
	Month   string  `json:"month"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
}

func (r *BudgetRepository) GetAnalytics(ctx context.Context, groupID uuid.UUID) ([]AnalyticsItem, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT 
			TO_CHAR(date, 'YYYY-MM') as month,
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
			COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
		FROM zunno.transactions
		WHERE group_id = $1
		GROUP BY TO_CHAR(date, 'YYYY-MM')
		ORDER BY month ASC
	`

	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query analytics: %w", err)
	}
	defer rows.Close()

	var res []AnalyticsItem
	for rows.Next() {
		var a AnalyticsItem
		if err := rows.Scan(&a.Month, &a.Income, &a.Expense); err != nil {
			return nil, fmt.Errorf("scan analytics: %w", err)
		}
		res = append(res, a)
	}
	return res, nil
}
