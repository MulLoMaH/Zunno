package budget_service

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

// SplitInput — вход для разделения счёта.
// ParticipantIDs — все, КРОМЕ плательщика (payer добавляется неявно).
type SplitInput struct {
	CategoryID     uuid.UUID
	Amount         float64
	Date           time.Time
	Description    string
	ParticipantIDs []uuid.UUID
}

// SplitTransaction создаёт транзакцию от имени payer'а и N долгов
// (каждый участник должен payer'у равную долю).
// Возвращает транзакцию и список созданных долгов.
//
// Округление: share округляется до 2 знаков. «Пропавшие» копейки
// (из-за округления) не добавляются никому — это упрощение MVP.
// Для 3000 / 3 → 1000.00 каждому, сходится. Для 100 / 3 → 33.33*2 + 33.34 у payer.
func (s *BudgetService) SplitTransaction(
	ctx context.Context,
	groupID, payerID uuid.UUID,
	in SplitInput,
) (domain.Transaction, []domain.Debt, error) {
	if in.Amount <= 0 {
		return domain.Transaction{}, nil, fmt.Errorf("amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if len(in.ParticipantIDs) == 0 {
		return domain.Transaction{}, nil, fmt.Errorf("participants required: %w", core_errors.ErrInvalidArgument)
	}
	if in.CategoryID == uuid.Nil {
		return domain.Transaction{}, nil, fmt.Errorf("category_id required: %w", core_errors.ErrInvalidArgument)
	}
	if in.Date.IsZero() {
		in.Date = time.Now()
	}

	// Валидация участников: все — активные члены группы.
	members, err := s.groups.GetGroupMembers(ctx, groupID)
	if err != nil {
		return domain.Transaction{}, nil, fmt.Errorf("get group members: %w", err)
	}
	memberSet := make(map[uuid.UUID]struct{}, len(members))
	for _, m := range members {
		memberSet[m.UserID] = struct{}{}
	}
	if _, ok := memberSet[payerID]; !ok {
		return domain.Transaction{}, nil, fmt.Errorf("payer is not a member: %w", core_errors.ErrForbidden)
	}
	for _, pid := range in.ParticipantIDs {
		if _, ok := memberSet[pid]; !ok {
			return domain.Transaction{}, nil, fmt.Errorf("participant %s is not a member: %w", pid, core_errors.ErrForbidden)
		}
		if pid == payerID {
			return domain.Transaction{}, nil, fmt.Errorf("payer must not be in participants: %w", core_errors.ErrInvalidArgument)
		}
	}

	// 1. Создаём транзакцию от плательщика.
	created, err := s.budget.CreateTransaction(ctx, domain.Transaction{
		Type:        domain.TransactionTypeExpense,
		GroupID:     groupID,
		UserID:      payerID,
		CategoryID:  in.CategoryID,
		Amount:      in.Amount,
		Date:        in.Date,
		Description: in.Description,
	})
	if err != nil {
		return domain.Transaction{}, nil, fmt.Errorf("create transaction: %w", err)
	}

	// 2. Считаем долю: (participants + payer) равных частей.
	total := len(in.ParticipantIDs) + 1
	shareCents := int64(math.Round(in.Amount * 100 / float64(total)))
	if shareCents <= 0 {
		return created, nil, fmt.Errorf("amount too small to split: %w", core_errors.ErrInvalidArgument)
	}
	share := float64(shareCents) / 100

	txID := created.ID
	debts := make([]domain.Debt, 0, len(in.ParticipantIDs))
	for _, pid := range in.ParticipantIDs {
		d := domain.Debt{
			GroupID:       groupID,
			TransactionID: &txID,
			CreditorID:    payerID,
			DebtorID:      pid,
			Amount:        share,
		}
		createdDebt, err := s.budget.CreateDebt(ctx, d)
		if err != nil {
			return created, debts, fmt.Errorf("create debt for %s: %w", pid, err)
		}
		debts = append(debts, createdDebt)
	}

	return created, debts, nil
}
