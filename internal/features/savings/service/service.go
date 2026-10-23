package savings_service

import (
	"context"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/google/uuid"
)

type SavingsService struct {
	repo   SavingsRepository
	logger *core_logger.Logger
}

type SavingsRepository interface {
	CreateGoal(ctx context.Context, g domain.SavingsGoal) (domain.SavingsGoal, error)
	ListGoals(ctx context.Context, groupID uuid.UUID) ([]domain.SavingsGoal, error)
	GetGoal(ctx context.Context, id uuid.UUID) (domain.SavingsGoal, error)
	UpdateGoalAmount(ctx context.Context, id uuid.UUID, newAmount float64) error
	DeleteGoal(ctx context.Context, id uuid.UUID) error

	GetWalletBalance(ctx context.Context, groupID uuid.UUID) (domain.WalletBalance, error)
	CreateTransferTransaction(ctx context.Context, tx domain.Transaction, goalID uuid.UUID) error
	TransferAtomic(ctx context.Context, groupID, userID, goalID uuid.UUID, amount float64, isDeposit bool, goalName string) error
}

func NewSavingsService(repo SavingsRepository, logger *core_logger.Logger) *SavingsService {
	return &SavingsService{repo: repo, logger: logger}
}
