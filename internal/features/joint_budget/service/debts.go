package budget_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

// GetUserDebts — все долги (входящие и исходящие) текущего пользователя.
func (s *BudgetService) GetUserDebts(ctx context.Context, userID uuid.UUID) ([]domain.Debt, error) {
	debts, err := s.budget.GetUserDebts(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get user debts: %w", err)
	}
	return debts, nil
}

// MarkDebtPaid — только кредитор может отметить долг как погашенный.
// Идемпотентно: повторный вызов на уже погашенном — no-op.
func (s *BudgetService) MarkDebtPaid(ctx context.Context, userID, debtID uuid.UUID) error {
	debts, err := s.budget.GetUserDebts(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user debts: %w", err)
	}
	var found *domain.Debt
	for i := range debts {
		if debts[i].ID == debtID {
			found = &debts[i]
			break
		}
	}
	if found == nil {
		return fmt.Errorf("debt %s not found for user: %w", debtID, core_errors.ErrForbidden)
	}
	if found.CreditorID != userID {
		return fmt.Errorf("only creditor can mark debt as paid: %w", core_errors.ErrForbidden)
	}
	if found.IsPaid {
		return nil
	}
	if err := s.budget.MarkDebtPaid(ctx, debtID); err != nil {
		return fmt.Errorf("mark debt paid: %w", err)
	}
	return nil
}
