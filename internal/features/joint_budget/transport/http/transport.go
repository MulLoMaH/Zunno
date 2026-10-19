package budget_transport_http

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	budget_service "github.com/MulLoMaH/Zunno/internal/features/joint_budget/service"
	budget_postgres_repository "github.com/MulLoMaH/Zunno/internal/features/joint_budget/repository/postgres"
)

type BudgetHTTPHandler struct {
	budgetService BudgetService
}

type BudgetService interface {
	DeleteTransaction(ctx context.Context, groupID, txID uuid.UUID) error
	GetAnalytics(ctx context.Context, groupID uuid.UUID) ([]budget_postgres_repository.AnalyticsItem, error)
	GetMembersSpent(ctx context.Context, groupID uuid.UUID, month string) ([]domain.MemberSpent, error)
	CreateCategory(ctx context.Context, groupID uuid.UUID, name, catType string, budgetLimit float64) (domain.Category, error)
	GetCategories(ctx context.Context, groupID uuid.UUID) ([]domain.Category, error)
	UpdateCategory(ctx context.Context, groupID, categoryID uuid.UUID, name, catType string, budgetLimit float64, expectedVersion int64) (domain.Category, error)
	DeleteCategory(ctx context.Context, groupID, categoryID uuid.UUID) error

	CreateTransaction(ctx context.Context, groupID, userID uuid.UUID, in budget_service.CreateTransactionInput) (domain.Transaction, error)
	GetTransactions(ctx context.Context, groupID uuid.UUID, f budget_service.GetTransactionsFilter) ([]domain.Transaction, error)

	GetBudgetSummary(ctx context.Context, groupID uuid.UUID, month string) (domain.BudgetSummary, error)
	GetStatistics(ctx context.Context, groupID uuid.UUID, month string, userID *uuid.UUID) ([]domain.CategoryStats, error)
}

// Дублируем типы, чтобы не тянуть repository в transport.
type CreateTransactionInput struct {
	CategoryID  uuid.UUID
	Amount      float64
	Date        time.Time
	Description string
}

type GetTransactionsFilter struct {
	From       *time.Time
	To         *time.Time
	CategoryID *uuid.UUID
	UserID     *uuid.UUID
	Limit      int
	Offset     int
}

func NewBudgetHTTPHandler(budgetService BudgetService) *BudgetHTTPHandler {
	return &BudgetHTTPHandler{budgetService: budgetService}
}

func (h *BudgetHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/transactions/{txId}",
			Handler: h.DeleteTransaction,
		},

		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/analytics",
			Handler: h.GetAnalytics,
		},

		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/budget/members",
			Handler: h.GetMembersSpent,
		},

		{Method: http.MethodPost, Path: "/groups/{id}/categories", Handler: h.CreateCategory},
		{Method: http.MethodGet, Path: "/groups/{id}/categories", Handler: h.GetCategories},
		{Method: http.MethodPatch, Path: "/groups/{id}/categories/{catId}", Handler: h.UpdateCategory},
		{Method: http.MethodDelete, Path: "/groups/{id}/categories/{catId}", Handler: h.DeleteCategory},

		{Method: http.MethodPost, Path: "/groups/{id}/transactions", Handler: h.CreateTransaction},
		{Method: http.MethodGet, Path: "/groups/{id}/transactions", Handler: h.GetTransactions},

		{Method: http.MethodGet, Path: "/groups/{id}/budget/summary", Handler: h.GetBudgetSummary},
		{Method: http.MethodGet, Path: "/groups/{id}/statistics", Handler: h.GetStatistics},
	}
}
