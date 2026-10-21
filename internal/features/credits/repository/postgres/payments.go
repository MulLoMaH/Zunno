package credits_postgres_repository

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

func (r *CreditsRepository) CreatePayment(ctx context.Context, p domain.CreditPayment) (domain.CreditPayment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.credit_payments
		    (credit_id, transaction_id, amount, principal_part, interest_part,
		     payment_date, type, early_recalc)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, credit_id, transaction_id, amount, principal_part, interest_part,
		          payment_date, type, early_recalc, created_at
	`
	var m CreditPaymentModel
	err := r.pool.QueryRow(ctx, query,
		p.CreditID, p.TransactionID, p.Amount, p.PrincipalPart, p.InterestPart,
		p.PaymentDate, p.Type, p.EarlyRecalc,
	).Scan(
		&m.ID, &m.CreditID, &m.TransactionID, &m.Amount, &m.PrincipalPart, &m.InterestPart,
		&m.PaymentDate, &m.Type, &m.EarlyRecalc, &m.CreatedAt,
	)
	if err != nil {
		return domain.CreditPayment{}, fmt.Errorf("create payment: %w", err)
	}
	return paymentFromModel(m), nil
}

func (r *CreditsRepository) ListPayments(ctx context.Context, creditID uuid.UUID) ([]domain.CreditPayment, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, credit_id, transaction_id, amount, principal_part, interest_part,
		       payment_date, type, early_recalc, created_at
		FROM zunno.credit_payments
		WHERE credit_id = $1
		ORDER BY payment_date ASC, created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, creditID)
	if err != nil {
		return nil, fmt.Errorf("list payments: %w", err)
	}
	defer rows.Close()

	var payments []domain.CreditPayment
	for rows.Next() {
		var m CreditPaymentModel
		if err := rows.Scan(
			&m.ID, &m.CreditID, &m.TransactionID, &m.Amount, &m.PrincipalPart, &m.InterestPart,
			&m.PaymentDate, &m.Type, &m.EarlyRecalc, &m.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan payment: %w", err)
		}
		payments = append(payments, paymentFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate payments: %w", err)
	}
	return payments, nil
}

func (r *CreditsRepository) DeletePayment(ctx context.Context, paymentID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.credit_payments WHERE id = $1`, paymentID)
	if err != nil {
		return fmt.Errorf("delete payment: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("payment not found: %w", err)
	}
	return nil
}
