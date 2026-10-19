package budget_postgres_repository

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *BudgetRepository) GetMembersSpent(
	ctx context.Context,
	groupID uuid.UUID,
	from, to time.Time,
) ([]domain.MemberSpent, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT 
			u.id, 
			u.full_name, 
			COALESCE(SUM(t.amount), 0) as spent
		FROM zunno.memberships m
		JOIN zunno.users u ON u.id = m.user_id
		LEFT JOIN zunno.transactions t ON t.user_id = u.id AND t.group_id = m.group_id AND t.date >= $2 AND t.date <= $3
		WHERE m.group_id = $1 AND m.status = 'active'
		GROUP BY u.id, u.full_name
		ORDER BY spent DESC
	`

	rows, err := r.pool.Query(ctx, query, groupID, from, to)
	if err != nil {
		return nil, fmt.Errorf("query members spent: %w", err)
	}
	defer rows.Close()

	var res []domain.MemberSpent
	for rows.Next() {
		var m domain.MemberSpent
		if err := rows.Scan(&m.UserID, &m.FullName, &m.Spent); err != nil {
			return nil, fmt.Errorf("scan member spent: %w", err)
		}
		res = append(res, m)
	}
	return res, nil
}
