package credits_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type CreditModel struct {
	ID          uuid.UUID
	Version     int64
	GroupID     uuid.UUID
	CreatedBy   uuid.UUID
	Name        string
	Principal   float64
	AnnualRate  float64
	TermMonths  int
	PaymentType string
	StartDate   time.Time
	Currency    string
	IsClosed    bool
	ClosedAt    *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CreditPaymentModel struct {
	ID            uuid.UUID
	CreditID      uuid.UUID
	TransactionID *uuid.UUID
	Amount        float64
	PrincipalPart float64
	InterestPart  float64
	PaymentDate   time.Time
	Type          string
	EarlyRecalc   *string
	CreatedAt     time.Time
}

func creditFromModel(m CreditModel) domain.Credit {
	return domain.Credit{
		ID:          m.ID,
		Version:     m.Version,
		GroupID:     m.GroupID,
		CreatedBy:   m.CreatedBy,
		Name:        m.Name,
		Principal:   m.Principal,
		AnnualRate:  m.AnnualRate,
		TermMonths:  m.TermMonths,
		PaymentType: m.PaymentType,
		StartDate:   m.StartDate,
		Currency:    m.Currency,
		IsClosed:    m.IsClosed,
		ClosedAt:    m.ClosedAt,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func paymentFromModel(m CreditPaymentModel) domain.CreditPayment {
	return domain.CreditPayment{
		ID:            m.ID,
		CreditID:      m.CreditID,
		TransactionID: m.TransactionID,
		Amount:        m.Amount,
		PrincipalPart: m.PrincipalPart,
		InterestPart:  m.InterestPart,
		PaymentDate:   m.PaymentDate,
		Type:          m.Type,
		EarlyRecalc:   m.EarlyRecalc,
		CreatedAt:     m.CreatedAt,
	}
}
