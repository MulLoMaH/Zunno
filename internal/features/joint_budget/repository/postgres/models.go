package budget_postgres_repository

import (
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type CategoryModel struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	Name        string
	Type        string
	BudgetLimit float64
	CreatedAt   time.Time
}

type TransactionModel struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	UserID      uuid.UUID
	CategoryID  uuid.UUID
	Amount      float64
	Date        time.Time
	Description string
	CreatedAt   time.Time
}

func categoryFromModel(m CategoryModel) domain.Category {
	return domain.Category{
		ID:          m.ID,
		Version:     m.Version,
		GroupID:     m.GroupID,
		Name:        m.Name,
		Type:        m.Type,
		BudgetLimit: m.BudgetLimit,
		CreatedAt:   m.CreatedAt,
	}
}

func transactionFromModel(m TransactionModel) domain.Transaction {
	return domain.Transaction{
		ID:          m.ID,
		Version:     m.Version,
		GroupID:     m.GroupID,
		UserID:      m.UserID,
		CategoryID:  m.CategoryID,
		Amount:      m.Amount,
		Date:        m.Date,
		Description: m.Description,
		CreatedAt:   m.CreatedAt,
	}
}
