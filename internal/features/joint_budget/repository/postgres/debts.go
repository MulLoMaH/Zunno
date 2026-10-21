package budget_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *BudgetRepository) CreateDebt(ctx context.Context, debt domain.Debt) (domain.Debt, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.debts (group_id, transaction_id, creditor_id, debtor_id, amount)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, is_paid, created_at
	`
	err := r.pool.QueryRow(ctx, query,
		debt.GroupID, debt.TransactionID, debt.CreditorID, debt.DebtorID, debt.Amount,
	).Scan(&debt.ID, &debt.IsPaid, &debt.CreatedAt)
	if err != nil {
		return domain.Debt{}, fmt.Errorf("create debt: %w", err)
	}
	return debt, nil
}

func (r *BudgetRepository) GetUserDebts(ctx context.Context, userID uuid.UUID) ([]domain.Debt, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT 
			d.id, d.group_id, d.transaction_id, d.creditor_id, d.debtor_id, d.amount, d.is_paid, d.created_at, d.paid_at,
			c.full_name as creditor_name,
			u.full_name as debtor_name
		FROM zunno.debts d
		JOIN zunno.users c ON c.id = d.creditor_id
		JOIN zunno.users u ON u.id = d.debtor_id
		WHERE d.debtor_id = $1 OR d.creditor_id = $1
		ORDER BY d.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query debts: %w", err)
	}
	defer rows.Close()

	var debts []domain.Debt
	for rows.Next() {
		var d domain.Debt
		if err := rows.Scan(
			&d.ID, &d.GroupID, &d.TransactionID, &d.CreditorID, &d.DebtorID, &d.Amount, &d.IsPaid, &d.CreatedAt, &d.PaidAt,
			&d.CreditorName, &d.DebtorName,
		); err != nil {
			return nil, fmt.Errorf("scan debt: %w", err)
		}
		debts = append(debts, d)
	}
	return debts, nil
}

func (r *BudgetRepository) MarkDebtPaid(ctx context.Context, debtID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `UPDATE zunno.debts SET is_paid = TRUE, paid_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, debtID)
	if err != nil {
		return fmt.Errorf("mark debt paid: %w", err)
	}
	return nil
}
