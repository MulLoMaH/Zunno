package domain

import (
	"fmt"
	"time"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

// Новые типы транзакций для копилки
const (
	TransactionTypeSavingsDeposit  = "savings_deposit"  // перевод в копилку (из кошелька)
	TransactionTypeSavingsWithdraw = "savings_withdraw" // снятие из копилки (в кошелёк)
)

type SavingsGoal struct {
	ID            uuid.UUID
	Version       int64
	GroupID       uuid.UUID
	Name          string
	TargetAmount  float64
	CurrentAmount float64
	Icon          string
	Color         string
	IsArchived    bool
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (s *SavingsGoal) Validate() error {
	if len([]rune(s.Name)) < 1 || len([]rune(s.Name)) > 200 {
		return fmt.Errorf("name must be 1-200 chars: %w", core_errors.ErrInvalidArgument)
	}
	if s.TargetAmount <= 0 {
		return fmt.Errorf("target_amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if s.CurrentAmount < 0 {
		return fmt.Errorf("current_amount cannot be negative: %w", core_errors.ErrInvalidArgument)
	}
	return nil
}

// WalletBalance — агрегат для ответа API
type WalletBalance struct {
	GroupID        uuid.UUID `json:"group_id"`
	Balance        float64   `json:"balance"`          // сколько свободно в кошельке
	TotalIncome    float64   `json:"total_income"`     // сумма всех доходов
	TotalExpense   float64   `json:"total_expense"`    // сумма всех расходов
	TotalInSavings float64   `json:"total_in_savings"` // сколько всего в копилках
	TransfersTo    float64   `json:"transfers_to"`     // отложено в копилки
	TransfersFrom  float64   `json:"transfers_from"`   // снято из копилок
}
