package domain

import (
	"fmt"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

type RecurringTransaction struct {
	ID              uuid.UUID
	GroupID         uuid.UUID
	UserID          uuid.UUID
	CategoryID      *uuid.UUID
	Title           string
	Type            string // "income" | "expense"
	Amount          float64
	DayOfMonth      int
	IsActive        bool
	LastProcessedAt *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

func (r *RecurringTransaction) Validate() error {
	if len([]rune(r.Title)) < 1 || len([]rune(r.Title)) > 200 {
		return fmt.Errorf("title must be 1-200 chars: %w", core_errors.ErrInvalidArgument)
	}
	if r.Amount <= 0 {
		return fmt.Errorf("amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if r.Type != TransactionTypeIncome && r.Type != TransactionTypeExpense {
		return fmt.Errorf("invalid type: %w", core_errors.ErrInvalidArgument)
	}
	if r.DayOfMonth < 1 || r.DayOfMonth > 31 {
		return fmt.Errorf("day_of_month must be 1-31: %w", core_errors.ErrInvalidArgument)
	}
	if r.CategoryID == nil {
		return fmt.Errorf("category_id is required: %w", core_errors.ErrInvalidArgument)
	}
	return nil
}
