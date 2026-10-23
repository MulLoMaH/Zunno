package recurring_service

import (
	"context"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

// Adapter to connect budget repo to recurring service requirements
type BudgetAdapter struct {
	repo interface {
		CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
		GetCategory(ctx context.Context, categoryID uuid.UUID) (domain.Category, error)
	}
}

func NewBudgetAdapter(r interface {
	CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error)
	GetCategory(ctx context.Context, categoryID uuid.UUID) (domain.Category, error)
}) *BudgetAdapter {
	return &BudgetAdapter{repo: r}
}

func (a *BudgetAdapter) CreateTransaction(ctx context.Context, t domain.Transaction) (domain.Transaction, error) {
	return a.repo.CreateTransaction(ctx, t)
}

func (a *BudgetAdapter) GetCategoryGroupID(ctx context.Context, catID uuid.UUID) (uuid.UUID, error) {
	cat, err := a.repo.GetCategory(ctx, catID)
	if err != nil {
		return uuid.Nil, err
	}
	return cat.GroupID, nil
}
