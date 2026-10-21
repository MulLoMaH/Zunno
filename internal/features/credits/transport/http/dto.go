package credits_transport_http

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	credits_service "github.com/MulLoMaH/Zunno/internal/features/credits/service"
	"github.com/google/uuid"
)

// ─── Requests ───

type CreateCreditRequest struct {
	Name        string    `json:"name"`
	Principal   float64   `json:"principal"`
	AnnualRate  float64   `json:"annual_rate"`
	TermMonths  int       `json:"term_months"`
	PaymentType string    `json:"payment_type"` // annuity | differentiated
	StartDate   time.Time `json:"start_date"`
	Currency    string    `json:"currency"`
}

type UpdateCreditRequest struct {
	Name        string    `json:"name"`
	Principal   float64   `json:"principal"`
	AnnualRate  float64   `json:"annual_rate"`
	TermMonths  int       `json:"term_months"`
	PaymentType string    `json:"payment_type"`
	StartDate   time.Time `json:"start_date"`
	Currency    string    `json:"currency"`
	Version     int64     `json:"version"`
}

type PayRequest struct {
	Amount          float64    `json:"amount"`
	PaymentDate     *time.Time `json:"payment_date,omitempty"`
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	AccountInBudget bool       `json:"account_in_budget"`
	Description     string     `json:"description"`
}

type EarlyPayRequest struct {
	Amount          float64    `json:"amount"`
	PaymentDate     *time.Time `json:"payment_date,omitempty"`
	EarlyRecalc     string     `json:"early_recalc"` // reduce_term | reduce_payment
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	AccountInBudget bool       `json:"account_in_budget"`
	Description     string     `json:"description"`
}

// ─── Responses ───

type CreditDTOResponse struct {
	ID          uuid.UUID  `json:"id"`
	Version     int64      `json:"version"`
	GroupID     uuid.UUID  `json:"group_id"`
	CreatedBy   uuid.UUID  `json:"created_by"`
	Name        string     `json:"name"`
	Principal   float64    `json:"principal"`
	AnnualRate  float64    `json:"annual_rate"`
	TermMonths  int        `json:"term_months"`
	PaymentType string     `json:"payment_type"`
	StartDate   time.Time  `json:"start_date"`
	Currency    string     `json:"currency"`
	IsClosed    bool       `json:"is_closed"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreditSummaryDTOResponse struct {
	MonthlyPayment     float64    `json:"monthly_payment"`
	TotalPaid          float64    `json:"total_paid"`
	PaidPrincipal      float64    `json:"paid_principal"`
	PaidInterest       float64    `json:"paid_interest"`
	RemainingPrincipal float64    `json:"remaining_principal"`
	RemainingInterest  float64    `json:"remaining_interest"`
	TotalOverpayment   float64    `json:"total_overpayment"`
	ProgressPercent    float64    `json:"progress_percent"`
	NextPaymentDate    *time.Time `json:"next_payment_date,omitempty"`
	NextPaymentAmount  float64    `json:"next_payment_amount"`
	PaymentsCount      int        `json:"payments_count"`
	ExpectedEndDate    time.Time  `json:"expected_end_date"`
	IsClosed           bool       `json:"is_closed"`
}

type CreditWithSummaryDTOResponse struct {
	Credit  CreditDTOResponse        `json:"credit"`
	Summary CreditSummaryDTOResponse `json:"summary"`
}

type ScheduleEntryDTOResponse struct {
	Month         int       `json:"month"`
	Date          time.Time `json:"date"`
	Amount        float64   `json:"amount"`
	PrincipalPart float64   `json:"principal_part"`
	InterestPart  float64   `json:"interest_part"`
	Remaining     float64   `json:"remaining"`
	IsPaid        bool      `json:"is_paid"`
	IsPast        bool      `json:"is_past"`
	PaymentID     string    `json:"payment_id,omitempty"`
}

type CreditPaymentDTOResponse struct {
	ID            uuid.UUID  `json:"id"`
	CreditID      uuid.UUID  `json:"credit_id"`
	TransactionID *uuid.UUID `json:"transaction_id,omitempty"`
	Amount        float64    `json:"amount"`
	PrincipalPart float64    `json:"principal_part"`
	InterestPart  float64    `json:"interest_part"`
	PaymentDate   time.Time  `json:"payment_date"`
	Type          string     `json:"type"`
	EarlyRecalc   *string    `json:"early_recalc,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type CreditDetailDTOResponse struct {
	Credit   CreditDTOResponse          `json:"credit"`
	Summary  CreditSummaryDTOResponse   `json:"summary"`
	Schedule []ScheduleEntryDTOResponse `json:"schedule"`
	Payments []CreditPaymentDTOResponse `json:"payments"`
}

// ─── Mappers ───

func creditDTOFromDomain(c domain.Credit) CreditDTOResponse {
	return CreditDTOResponse{
		ID:          c.ID,
		Version:     c.Version,
		GroupID:     c.GroupID,
		CreatedBy:   c.CreatedBy,
		Name:        c.Name,
		Principal:   c.Principal,
		AnnualRate:  c.AnnualRate,
		TermMonths:  c.TermMonths,
		PaymentType: c.PaymentType,
		StartDate:   c.StartDate,
		Currency:    c.Currency,
		IsClosed:    c.IsClosed,
		ClosedAt:    c.ClosedAt,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}

func summaryDTOFromService(s credits_service.CreditSummary) CreditSummaryDTOResponse {
	return CreditSummaryDTOResponse{
		MonthlyPayment:     s.MonthlyPayment,
		TotalPaid:          s.TotalPaid,
		PaidPrincipal:      s.PaidPrincipal,
		PaidInterest:       s.PaidInterest,
		RemainingPrincipal: s.RemainingPrincipal,
		RemainingInterest:  s.RemainingInterest,
		TotalOverpayment:   s.TotalOverpayment,
		ProgressPercent:    s.ProgressPercent,
		NextPaymentDate:    s.NextPaymentDate,
		NextPaymentAmount:  s.NextPaymentAmount,
		PaymentsCount:      s.PaymentsCount,
		ExpectedEndDate:    s.ExpectedEndDate,
		IsClosed:           s.IsClosed,
	}
}

func creditWithSummaryDTO(cws credits_service.CreditWithSummary) CreditWithSummaryDTOResponse {
	return CreditWithSummaryDTOResponse{
		Credit:  creditDTOFromDomain(cws.Credit),
		Summary: summaryDTOFromService(cws.Summary),
	}
}

func creditWithSummariesDTO(list []credits_service.CreditWithSummary) []CreditWithSummaryDTOResponse {
	out := make([]CreditWithSummaryDTOResponse, len(list))
	for i, cws := range list {
		out[i] = creditWithSummaryDTO(cws)
	}
	return out
}

func paymentDTOFromDomain(p domain.CreditPayment) CreditPaymentDTOResponse {
	return CreditPaymentDTOResponse{
		ID:            p.ID,
		CreditID:      p.CreditID,
		TransactionID: p.TransactionID,
		Amount:        p.Amount,
		PrincipalPart: p.PrincipalPart,
		InterestPart:  p.InterestPart,
		PaymentDate:   p.PaymentDate,
		Type:          p.Type,
		EarlyRecalc:   p.EarlyRecalc,
		CreatedAt:     p.CreatedAt,
	}
}

func scheduleDTOFromService(entries []credits_service.ScheduleEntry) []ScheduleEntryDTOResponse {
	out := make([]ScheduleEntryDTOResponse, len(entries))
	for i, e := range entries {
		out[i] = ScheduleEntryDTOResponse{
			Month:         e.Month,
			Date:          e.Date,
			Amount:        e.Amount,
			PrincipalPart: e.PrincipalPart,
			InterestPart:  e.InterestPart,
			Remaining:     e.Remaining,
			IsPaid:        e.IsPaid,
			IsPast:        e.IsPast,
			PaymentID:     e.PaymentID,
		}
	}
	return out
}

func detailDTOFromService(d credits_service.CreditDetail) CreditDetailDTOResponse {
	payments := make([]CreditPaymentDTOResponse, len(d.Payments))
	for i, p := range d.Payments {
		payments[i] = paymentDTOFromDomain(p)
	}
	return CreditDetailDTOResponse{
		Credit:   creditDTOFromDomain(d.Credit),
		Summary:  summaryDTOFromService(d.Summary),
		Schedule: scheduleDTOFromService(d.Schedule),
		Payments: payments,
	}
}
