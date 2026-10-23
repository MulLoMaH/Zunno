package recurring_service

import (
	"context"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/google/uuid"
)

type RecurringService struct {
	recurring RecurringRepository
	budget    BudgetRepository
	logger    *core_logger.Logger
}

type RecurringRepository interface {
	CreateRecurring(ctx context.Context, rt domain.RecurringTransaction) (domain.RecurringTransaction, error)
	GetRecurring(ctx context.Context, id uuid.UUID) (domain.RecurringTransaction, error)
	ListRecurrings(ctx context.Context, groupID uuid.UUID) ([]domain.RecurringTransaction, error)
	UpdateRecurring(ctx context.Context, id uuid.UUID, rt domain.RecurringTransaction) (domain.RecurringTransaction, error)
	DeleteRecurring(ctx context.Context, id uuid.UUID) error
	ListPendingForMonth(ctx context.Context, day int, daysInMonth int, monthStart time.Time) ([]domain.RecurringTransaction, error)
	MarkProcessed(ctx context.Context, id uuid.UUID, processedAt time.Time) error
	MarkProcessedAtomic(ctx context.Context, id uuid.UUID, monthStart, processedAt time.Time) (bool, error)
	UnmarkProcessed(ctx context.Context, id uuid.UUID) error
}

type BudgetRepository interface {
	CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
	GetCategoryGroupID(ctx context.Context, catID uuid.UUID) (uuid.UUID, error)
}

func NewRecurringService(
	recurring RecurringRepository,
	budget BudgetRepository,
	logger *core_logger.Logger,
) *RecurringService {
	return &RecurringService{
		recurring: recurring,
		budget:    budget,
		logger:    logger,
	}
}
