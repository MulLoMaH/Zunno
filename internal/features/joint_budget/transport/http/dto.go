package budget_transport_http

import (
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type CategoryDTOResponse struct {
	ID          uuid.UUID `json:"id"`
	Version     int64     `json:"version"`
	GroupID     uuid.UUID `json:"group_id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	BudgetLimit float64   `json:"budget_limit"`
	CreatedAt   time.Time `json:"created_at"`
}

type TransactionDTOResponse struct {
	ID          uuid.UUID `json:"id"`
	Version     int64     `json:"version"`
	GroupID     uuid.UUID `json:"group_id"`
	UserID      uuid.UUID `json:"user_id"`
	CategoryID  uuid.UUID `json:"category_id"`
	Amount      float64   `json:"amount"`
	Date        time.Time `json:"date"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type BudgetSummaryDTOResponse struct {
	GroupID    uuid.UUID                      `json:"group_id"`
	Month      string                         `json:"month"`
	TotalSpent float64                        `json:"total_spent"`
	TotalLimit float64                        `json:"total_limit"`
	Categories []BudgetSummaryItemDTOResponse `json:"categories"`
}

type BudgetSummaryItemDTOResponse struct {
	CategoryID uuid.UUID `json:"category_id"`
	Name       string    `json:"name"`
	Type       string    `json:"type"`
	Limit      float64   `json:"limit"`
	Spent      float64   `json:"spent"`
	Overspent  bool      `json:"overspent"`
}

type CategoryStatsDTOResponse struct {
	GroupID     uuid.UUID `json:"group_id"`
	UserID      uuid.UUID `json:"user_id"`
	CategoryID  uuid.UUID `json:"category_id"`
	Month       string    `json:"month"`
	TotalAmount float64   `json:"total_amount"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func categoryDTOFromDomain(c domain.Category) CategoryDTOResponse {
	return CategoryDTOResponse{
		ID:          c.ID,
		Version:     c.Version,
		GroupID:     c.GroupID,
		Name:        c.Name,
		Type:        c.Type,
		BudgetLimit: c.BudgetLimit,
		CreatedAt:   c.CreatedAt,
	}
}

func categoriesDTOsFromDomains(cs []domain.Category) []CategoryDTOResponse {
	out := make([]CategoryDTOResponse, len(cs))
	for i, c := range cs {
		out[i] = categoryDTOFromDomain(c)
	}
	return out
}

func transactionDTOFromDomain(t domain.Transaction) TransactionDTOResponse {
	return TransactionDTOResponse{
		ID:          t.ID,
		Version:     t.Version,
		GroupID:     t.GroupID,
		UserID:      t.UserID,
		CategoryID:  t.CategoryID,
		Amount:      t.Amount,
		Date:        t.Date,
		Description: t.Description,
		CreatedAt:   t.CreatedAt,
	}
}

func transactionsDTOsFromDomains(txs []domain.Transaction) []TransactionDTOResponse {
	out := make([]TransactionDTOResponse, len(txs))
	for i, t := range txs {
		out[i] = transactionDTOFromDomain(t)
	}
	return out
}

func statsDTOsFromDomains(ss []domain.CategoryStats) []CategoryStatsDTOResponse {
	out := make([]CategoryStatsDTOResponse, len(ss))
	for i, s := range ss {
		out[i] = CategoryStatsDTOResponse{
			GroupID:     s.GroupID,
			UserID:      s.UserID,
			CategoryID:  s.CategoryID,
			Month:       s.Month,
			TotalAmount: s.TotalAmount,
			UpdatedAt:   s.UpdatedAt,
		}
	}
	return out
}
