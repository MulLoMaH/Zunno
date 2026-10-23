package savings_service

import (
	"context"
	"fmt"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

type CreateGoalInput struct {
	Name         string
	TargetAmount float64
	Icon         string
	Color        string
}

func (s *SavingsService) CreateGoal(ctx context.Context, groupID uuid.UUID, in CreateGoalInput) (domain.SavingsGoal, error) {
	g := domain.SavingsGoal{
		GroupID:       groupID,
		Name:          in.Name,
		TargetAmount:  in.TargetAmount,
		CurrentAmount: 0,
		Icon:          in.Icon,
		Color:         in.Color,
	}
	if g.Icon == "" {
		g.Icon = "piggy-bank"
	}
	if err := g.Validate(); err != nil {
		return domain.SavingsGoal{}, err
	}
	return s.repo.CreateGoal(ctx, g)
}

func (s *SavingsService) ListGoals(ctx context.Context, groupID uuid.UUID) ([]domain.SavingsGoal, error) {
	return s.repo.ListGoals(ctx, groupID)
}

func (s *SavingsService) GetWallet(ctx context.Context, groupID uuid.UUID) (domain.WalletBalance, error) {
	return s.repo.GetWalletBalance(ctx, groupID)
}

func (s *SavingsService) DeleteGoal(ctx context.Context, groupID, goalID uuid.UUID) error {
	g, err := s.repo.GetGoal(ctx, goalID)
	if err != nil {
		return err
	}
	if g.GroupID != groupID {
		return core_errors.ErrInvalidArgument
	}
	if g.CurrentAmount > 0 {
		return fmt.Errorf("cannot delete goal with money inside (%.2f): withdraw first: %w", g.CurrentAmount, core_errors.ErrInvalidArgument)
	}
	return s.repo.DeleteGoal(ctx, goalID)
}

// TransferInput — перевод между кошельком и копилкой
type TransferInput struct {
	UserID    uuid.UUID
	GoalID    uuid.UUID
	Amount    float64
	IsDeposit bool // true = в копилку, false = из копилки
}

func (s *SavingsService) Transfer(ctx context.Context, groupID uuid.UUID, in TransferInput) (domain.WalletBalance, error) {
	if in.Amount <= 0 {
		return domain.WalletBalance{}, fmt.Errorf("amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}

	// Получаем кошелёк и копилку
	wallet, err := s.repo.GetWalletBalance(ctx, groupID)
	if err != nil {
		return domain.WalletBalance{}, fmt.Errorf("get wallet: %w", err)
	}

	goal, err := s.repo.GetGoal(ctx, in.GoalID)
	if err != nil {
		return domain.WalletBalance{}, err
	}
	if goal.GroupID != groupID {
		return domain.WalletBalance{}, core_errors.ErrInvalidArgument
	}

	// Проверка баланса кошелька (для депозита)
	if in.IsDeposit && wallet.Balance < in.Amount {
		return domain.WalletBalance{}, fmt.Errorf("not enough money in wallet: available %.2f, requested %.2f: %w", wallet.Balance, in.Amount, core_errors.ErrInvalidArgument)
	}

	// Атомарная операция: обновление копилки + запись транзакции
	if err := s.repo.TransferAtomic(ctx, groupID, in.UserID, goal.ID, in.Amount, in.IsDeposit, goal.Name); err != nil {
		return domain.WalletBalance{}, fmt.Errorf("transfer: %w", err)
	}

	// Возвращаем новый баланс
	return s.repo.GetWalletBalance(ctx, groupID)
}
