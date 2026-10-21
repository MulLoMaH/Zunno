package domain

import (
	"fmt"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

// Типы платежа
const (
	CreditPaymentTypeAnnuity        = "annuity"
	CreditPaymentTypeDifferentiated = "differentiated"
)

// Типы платежей по кредиту
const (
	CreditPaymentKindRegular = "regular"
	CreditPaymentKindEarly   = "early"
)

// Стратегии пересчёта при досрочном погашении
const (
	CreditEarlyRecalcReduceTerm    = "reduce_term"
	CreditEarlyRecalcReducePayment = "reduce_payment"
)

type Credit struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	CreatedBy   uuid.UUID
	Name        string
	Principal   float64
	AnnualRate  float64
	TermMonths  int
	PaymentType string
	StartDate   time.Time
	Currency    string
	IsClosed    bool
	ClosedAt    *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreditPayment struct {
	ID            uuid.UUID
	CreditID      uuid.UUID
	TransactionID *uuid.UUID
	Amount        float64
	PrincipalPart float64
	InterestPart  float64
	PaymentDate   time.Time
	Type          string
	EarlyRecalc   *string
	CreatedAt     time.Time
}

func (c *Credit) Validate() error {
	if len([]rune(c.Name)) < 1 || len([]rune(c.Name)) > 200 {
		return fmt.Errorf("name must be 1-200 chars: %w", core_errors.ErrInvalidArgument)
	}
	if c.Principal <= 0 {
		return fmt.Errorf("principal must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if c.AnnualRate < 0 {
		return fmt.Errorf("annual_rate must be >= 0: %w", core_errors.ErrInvalidArgument)
	}
	if c.TermMonths <= 0 {
		return fmt.Errorf("term_months must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if c.PaymentType != CreditPaymentTypeAnnuity && c.PaymentType != CreditPaymentTypeDifferentiated {
		return fmt.Errorf("invalid payment_type: %w", core_errors.ErrInvalidArgument)
	}
	if c.StartDate.IsZero() {
		return fmt.Errorf("start_date required: %w", core_errors.ErrInvalidArgument)
	}
	if len(c.Currency) != 3 {
		return fmt.Errorf("currency must be 3 chars: %w", core_errors.ErrInvalidArgument)
	}
	return nil
}
