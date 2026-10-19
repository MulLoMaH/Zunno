package budget_postgres_repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ExportTransactionRow struct {
	Date         time.Time
	Type         string
	CategoryName string
	Description  string
	Amount       float64
	UserName     string
}

func (r *BudgetRepository) ExportTransactions(
	ctx context.Context,
	groupID uuid.UUID,
) ([]ExportTransactionRow, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT
			t.date,
			t.type,
			COALESCE(c.name, 'Без категории') AS category_name,
			COALESCE(t.description, '') AS description,
			t.amount,
			COALESCE(u.full_name, 'Удалённый пользователь') AS user_name
		FROM zunno.transactions t
		LEFT JOIN zunno.categories c ON c.id = t.category_id
		LEFT JOIN zunno.users u ON u.id = t.user_id
		WHERE t.group_id = $1
		ORDER BY t.date DESC
	`

	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("query export transactions: %w", err)
	}
	defer rows.Close()

	var res []ExportTransactionRow
	for rows.Next() {
		var row ExportTransactionRow
		if err := rows.Scan(
			&row.Date,
			&row.Type,
			&row.CategoryName,
			&row.Description,
			&row.Amount,
			&row.UserName,
		); err != nil {
			return nil, fmt.Errorf("scan export row: %w", err)
		}
		res = append(res, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate export rows: %w", err)
	}

	return res, nil
}
