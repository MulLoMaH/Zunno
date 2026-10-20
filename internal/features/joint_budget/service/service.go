package budget_service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/MulLoMaH/Zunno/internal/core/telegram"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
)

type BudgetService struct {
	budget   BudgetRepository
	producer EventProducer
	groups   GroupsRepository
	users    UsersRepository
	tg       *telegram.Client
}

type GroupsRepository interface {
	GetGroupTelegramChatIDs(ctx context.Context, groupID uuid.UUID) ([]int64, error)
	GetGroupMembers(ctx context.Context, groupID uuid.UUID) ([]domain.GroupMember, error)
}

type UsersRepository interface {
	GetUser(ctx context.Context, id uuid.UUID) (domain.User, error)
}

type EventProducer interface {
	Publish(ctx context.Context, key string, payload any) error
}

type BudgetRepository interface {
	CreateCategory(ctx context.Context, cat domain.Category) (domain.Category, error)
	GetCategories(ctx context.Context, groupID uuid.UUID) ([]domain.Category, error)
	GetCategory(ctx context.Context, categoryID uuid.UUID) (domain.Category, error)
	UpdateCategory(ctx context.Context, categoryID uuid.UUID, name, catType string, budgetLimit float64, expectedVersion int64) (domain.Category, error)
	DeleteCategory(ctx context.Context, categoryID uuid.UUID) error

	CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
	GetTransactions(ctx context.Context, f budget_postgres_repository.TransactionsFilter) ([]domain.Transaction, error)
	DeleteTransaction(ctx context.Context, groupID, txID uuid.UUID) error
	ExportTransactions(ctx context.Context, groupID uuid.UUID) ([]budget_postgres_repository.ExportTransactionRow, error)

	GetCategorySpent(ctx context.Context, categoryID uuid.UUID, from, to time.Time) (float64, error)
	GetMembersSpent(ctx context.Context, groupID uuid.UUID, from, to time.Time) ([]domain.MemberSpent, error)

	GetCategoryStats(ctx context.Context, groupID uuid.UUID, month string, userID *uuid.UUID) ([]domain.CategoryStats, error)
	StatsExist(ctx context.Context, groupID uuid.UUID, month string) (bool, error)
	GetAnalytics(ctx context.Context, groupID uuid.UUID) ([]budget_postgres_repository.AnalyticsItem, error)

	// Долги
	CreateDebt(ctx context.Context, debt domain.Debt) (domain.Debt, error)
	GetUserDebts(ctx context.Context, userID uuid.UUID) ([]domain.Debt, error)
	MarkDebtPaid(ctx context.Context, debtID uuid.UUID) error
}

func NewBudgetService(
	budget BudgetRepository,
	producer EventProducer,
	groups GroupsRepository,
	users UsersRepository,
	tg *telegram.Client,
) *BudgetService {
	return &BudgetService{
		budget:   budget,
		producer: producer,
		groups:   groups,
		users:    users,
		tg:       tg,
	}
}
