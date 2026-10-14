package budget_service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_kafka "github.com/MulLoMaH/Zunno/internal/core/kafka"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
)

type BudgetService struct {
	budget   BudgetRepository
	producer EventProducer
}

type BudgetRepository interface {
	CreateCategory(ctx context.Context, cat domain.Category) (domain.Category, error)
	GetCategories(ctx context.Context, groupID uuid.UUID) ([]domain.Category, error)
	GetCategory(ctx context.Context, categoryID uuid.UUID) (domain.Category, error)
	UpdateCategory(ctx context.Context, categoryID uuid.UUID, name, catType string, budgetLimit float64, expectedVersion int64) (domain.Category, error)
	DeleteCategory(ctx context.Context, categoryID uuid.UUID) error

	CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
	GetTransactions(ctx context.Context, f budget_postgres_repository.TransactionsFilter) ([]domain.Transaction, error)
	GetCategorySpent(ctx context.Context, categoryID uuid.UUID, from, to time.Time) (float64, error)

	GetCategoryStats(ctx context.Context, groupID uuid.UUID, month string, userID *uuid.UUID) ([]domain.CategoryStats, error)
	StatsExist(ctx context.Context, groupID uuid.UUID, month string) (bool, error)
}

type EventProducer interface {
	Publish(ctx context.Context, key string, payload any) error
}

func NewBudgetService(budget BudgetRepository, producer EventProducer) *BudgetService {
	return &BudgetService{budget: budget, producer: producer}
}

// переиспользуем тип из kafka-пакета
var _ = core_kafka.EventTransactionCreated
