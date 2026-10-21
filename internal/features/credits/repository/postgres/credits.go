package credits_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_postgres_pool "github.com/MulLoMaH/Zunno/internal/core/repository/postgres"
	"github.com/google/uuid"
)

func (r *CreditsRepository) CreateCredit(ctx context.Context, c domain.Credit) (domain.Credit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		INSERT INTO zunno.credits
		    (group_id, created_by, name, principal, annual_rate, term_months,
		     payment_type, start_date, currency)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, version, group_id, created_by, name, principal, annual_rate,
		          term_months, payment_type, start_date, currency,
		          is_closed, closed_at, created_at, updated_at
	`
	var m CreditModel
	err := r.pool.QueryRow(ctx, query,
		c.GroupID, c.CreatedBy, c.Name, c.Principal, c.AnnualRate, c.TermMonths,
		c.PaymentType, c.StartDate, c.Currency,
	).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatedBy, &m.Name, &m.Principal,
		&m.AnnualRate, &m.TermMonths, &m.PaymentType, &m.StartDate, &m.Currency,
		&m.IsClosed, &m.ClosedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return domain.Credit{}, fmt.Errorf("create credit: %w", err)
	}
	return creditFromModel(m), nil
}

func (r *CreditsRepository) GetCredit(ctx context.Context, creditID uuid.UUID) (domain.Credit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, created_by, name, principal, annual_rate,
		       term_months, payment_type, start_date, currency,
		       is_closed, closed_at, created_at, updated_at
		FROM zunno.credits
		WHERE id = $1
	`
	var m CreditModel
	err := r.pool.QueryRow(ctx, query, creditID).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatedBy, &m.Name, &m.Principal,
		&m.AnnualRate, &m.TermMonths, &m.PaymentType, &m.StartDate, &m.Currency,
		&m.IsClosed, &m.ClosedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Credit{}, core_errors.ErrCreditNotFound
		}
		return domain.Credit{}, fmt.Errorf("get credit: %w", err)
	}
	return creditFromModel(m), nil
}

func (r *CreditsRepository) ListCredits(ctx context.Context, groupID uuid.UUID) ([]domain.Credit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		SELECT id, version, group_id, created_by, name, principal, annual_rate,
		       term_months, payment_type, start_date, currency,
		       is_closed, closed_at, created_at, updated_at
		FROM zunno.credits
		WHERE group_id = $1
		ORDER BY is_closed ASC, created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, groupID)
	if err != nil {
		return nil, fmt.Errorf("list credits: %w", err)
	}
	defer rows.Close()

	var credits []domain.Credit
	for rows.Next() {
		var m CreditModel
		if err := rows.Scan(
			&m.ID, &m.Version, &m.GroupID, &m.CreatedBy, &m.Name, &m.Principal,
			&m.AnnualRate, &m.TermMonths, &m.PaymentType, &m.StartDate, &m.Currency,
			&m.IsClosed, &m.ClosedAt, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan credit: %w", err)
		}
		credits = append(credits, creditFromModel(m))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate credits: %w", err)
	}
	return credits, nil
}

func (r *CreditsRepository) UpdateCredit(
	ctx context.Context,
	creditID uuid.UUID,
	name string,
	principal, annualRate float64,
	termMonths int,
	paymentType string,
	startDate time.Time,
	currency string,
	expectedVersion int64,
) (domain.Credit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.credits
		SET name         = $1,
		    principal    = $2,
		    annual_rate  = $3,
		    term_months  = $4,
		    payment_type = $5,
		    start_date   = $6,
		    currency     = $7,
		    version      = version + 1,
		    updated_at   = NOW()
		WHERE id = $8 AND version = $9
		RETURNING id, version, group_id, created_by, name, principal, annual_rate,
		          term_months, payment_type, start_date, currency,
		          is_closed, closed_at, created_at, updated_at
	`
	var m CreditModel
	err := r.pool.QueryRow(ctx, query,
		name, principal, annualRate, termMonths, paymentType, startDate, currency,
		creditID, expectedVersion,
	).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatedBy, &m.Name, &m.Principal,
		&m.AnnualRate, &m.TermMonths, &m.PaymentType, &m.StartDate, &m.Currency,
		&m.IsClosed, &m.ClosedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Credit{}, core_errors.ErrConflict
		}
		return domain.Credit{}, fmt.Errorf("update credit: %w", err)
	}
	return creditFromModel(m), nil
}

func (r *CreditsRepository) DeleteCredit(ctx context.Context, creditID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	tag, err := r.pool.Exec(ctx, `DELETE FROM zunno.credits WHERE id = $1`, creditID)
	if err != nil {
		return fmt.Errorf("delete credit: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return core_errors.ErrCreditNotFound
	}
	return nil
}

// CloseCredit — пометить кредит закрытым (досрочно или планово).
func (r *CreditsRepository) CloseCredit(ctx context.Context, creditID uuid.UUID) (domain.Credit, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
		UPDATE zunno.credits
		SET is_closed = TRUE,
		    closed_at = NOW(),
		    version   = version + 1,
		    updated_at = NOW()
		WHERE id = $1 AND is_closed = FALSE
		RETURNING id, version, group_id, created_by, name, principal, annual_rate,
		          term_months, payment_type, start_date, currency,
		          is_closed, closed_at, created_at, updated_at
	`
	var m CreditModel
	err := r.pool.QueryRow(ctx, query, creditID).Scan(
		&m.ID, &m.Version, &m.GroupID, &m.CreatedBy, &m.Name, &m.Principal,
		&m.AnnualRate, &m.TermMonths, &m.PaymentType, &m.StartDate, &m.Currency,
		&m.IsClosed, &m.ClosedAt, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return domain.Credit{}, core_errors.ErrConflict
		}
		return domain.Credit{}, fmt.Errorf("close credit: %w", err)
	}
	return creditFromModel(m), nil
}
