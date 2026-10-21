package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	TransactionTypeIncome = "income"
	TransactionTypeExpense = "expense"
	CategoryTypeFixed       = "fixed"
	CategoryTypeSpontaneous = "spontaneous"
)

type Category struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	Name        string
	Type        string
	BudgetLimit float64
	CreatedAt   time.Time
}

type Transaction struct {
	Type string
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

type CategoryStats struct {
	Version     int64
	GroupID     uuid.UUID
	UserID      uuid.UUID
	CategoryID  uuid.UUID
	Month       string
	TotalAmount float64
	UpdatedAt   time.Time
}

// BudgetSummary — агрегат по категориям за месяц
type BudgetSummary struct {
	GroupID    uuid.UUID
	Month      string
	TotalSpent float64
	TotalLimit float64
	Categories []BudgetSummaryItem
}

type BudgetSummaryItem struct {
	CategoryID uuid.UUID
	Name       string
	Type       string
	Limit      float64
	Spent      float64
	Overspent  bool
}


type MemberSpent struct {
	UserID   uuid.UUID `json:"user_id"`
	FullName string    `json:"full_name"`
	Spent    float64   `json:"spent"`
}

type Debt struct {
	ID            uuid.UUID
	GroupID       uuid.UUID
	TransactionID *uuid.UUID
	CreditorID    uuid.UUID
	CreditorName  string
	DebtorID      uuid.UUID
	DebtorName    string
	Amount        float64
	IsPaid        bool
	CreatedAt     time.Time
	PaidAt        *time.Time
}
