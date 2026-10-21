package credits_service

import (
	"context"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	"github.com/google/uuid"
)

type CreditService struct {
	credits CreditsRepository
	budget  BudgetRepository
	logger  *core_logger.Logger
}

type CreditsRepository interface {
	CreateCredit(ctx context.Context, c domain.Credit) (domain.Credit, error)
	GetCredit(ctx context.Context, creditID uuid.UUID) (domain.Credit, error)
	ListCredits(ctx context.Context, groupID uuid.UUID) ([]domain.Credit, error)
	UpdateCredit(ctx context.Context, creditID uuid.UUID, name string, principal, annualRate float64, termMonths int, paymentType string, startDate time.Time, currency string, expectedVersion int64) (domain.Credit, error)
	DeleteCredit(ctx context.Context, creditID uuid.UUID) error
	CloseCredit(ctx context.Context, creditID uuid.UUID) (domain.Credit, error)

	CreatePayment(ctx context.Context, p domain.CreditPayment) (domain.CreditPayment, error)
	ListPayments(ctx context.Context, creditID uuid.UUID) ([]domain.CreditPayment, error)
	DeletePayment(ctx context.Context, paymentID uuid.UUID) error
}

// BudgetRepository — минимальный интерфейс для автосоздания транзакций.
type BudgetRepository interface {
	CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
}

func NewCreditService(
	credits CreditsRepository,
	budget BudgetRepository,
	logger *core_logger.Logger,
) *CreditService {
	return &CreditService{credits: credits, budget: budget, logger: logger}
}

// CreditWithSummary — для ответа API.
type CreditWithSummary struct {
	Credit  domain.Credit
	Summary CreditSummary
}

var _ = time.Now
