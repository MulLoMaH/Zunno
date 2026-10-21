package credits_service

import (
	"context"
	"fmt"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// CreateCreditInput — вход для создания.
type CreateCreditInput struct {
	Name        string
	Principal   float64
	AnnualRate  float64
	TermMonths  int
	PaymentType string
	StartDate   time.Time
	Currency    string
}

// CreateCredit — создаёт кредит.
func (s *CreditService) CreateCredit(
	ctx context.Context,
	groupID, userID uuid.UUID,
	in CreateCreditInput,
) (CreditWithSummary, error) {
	c := domain.Credit{
		GroupID:     groupID,
		CreatedBy:   userID,
		Name:        in.Name,
		Principal:   in.Principal,
		AnnualRate:  in.AnnualRate,
		TermMonths:  in.TermMonths,
		PaymentType: in.PaymentType,
		StartDate:   in.StartDate,
		Currency:    in.Currency,
	}
	if c.PaymentType == "" {
		c.PaymentType = domain.CreditPaymentTypeAnnuity
	}
	if c.Currency == "" {
		c.Currency = "RUB"
	}
	if err := c.Validate(); err != nil {
		return CreditWithSummary{}, err
	}

	created, err := s.credits.CreateCredit(ctx, c)
	if err != nil {
		return CreditWithSummary{}, fmt.Errorf("create credit: %w", err)
	}

	schedule := BuildSchedule(created, nil)
	summary := CalcSummary(created, nil, schedule)
	return CreditWithSummary{Credit: created, Summary: summary}, nil
}

// ListCredits — все кредиты группы с summary.
func (s *CreditService) ListCredits(ctx context.Context, groupID uuid.UUID) ([]CreditWithSummary, error) {
	credits, err := s.credits.ListCredits(ctx, groupID)
	if err != nil {
		return nil, fmt.Errorf("list credits: %w", err)
	}

	result := make([]CreditWithSummary, 0, len(credits))
	for _, c := range credits {
		payments, err := s.credits.ListPayments(ctx, c.ID)
		if err != nil {
			return nil, fmt.Errorf("list payments for credit %s: %w", c.ID, err)
		}
		schedule := BuildSchedule(c, payments)
		summary := CalcSummary(c, payments, schedule)
		result = append(result, CreditWithSummary{Credit: c, Summary: summary})
	}
	return result, nil
}

// GetCreditDetail — кредит + график + платежи + summary.
type CreditDetail struct {
	Credit   domain.Credit
	Summary  CreditSummary
	Schedule []ScheduleEntry
	Payments []domain.CreditPayment
}

func (s *CreditService) GetCreditDetail(ctx context.Context, groupID, creditID uuid.UUID) (CreditDetail, error) {
	c, err := s.credits.GetCredit(ctx, creditID)
	if err != nil {
		return CreditDetail{}, err
	}
	if c.GroupID != groupID {
		return CreditDetail{}, core_errors.ErrCreditNotFound
	}
	payments, err := s.credits.ListPayments(ctx, creditID)
	if err != nil {
		return CreditDetail{}, fmt.Errorf("list payments: %w", err)
	}
	schedule := BuildSchedule(c, payments)
	summary := CalcSummary(c, payments, schedule)
	return CreditDetail{Credit: c, Summary: summary, Schedule: schedule, Payments: payments}, nil
}

// DeleteCredit — удалить.
func (s *CreditService) DeleteCredit(ctx context.Context, groupID, creditID uuid.UUID) error {
	c, err := s.credits.GetCredit(ctx, creditID)
	if err != nil {
		return err
	}
	if c.GroupID != groupID {
		return core_errors.ErrCreditNotFound
	}
	return s.credits.DeleteCredit(ctx, creditID)
}

// PayInput — вход для оплаты.
type PayInput struct {
	Amount          float64
	PaymentDate     time.Time
	IsEarly         bool
	EarlyRecalc     *string    // "reduce_term" | "reduce_payment"
	CategoryID      *uuid.UUID // если задан — создаём транзакцию в этой категории
	Description     string
	AccountInBudget bool // учитывать в бюджете
}

// Pay — оплата месяца или досрочка.
func (s *CreditService) Pay(
	ctx context.Context,
	groupID, userID, creditID uuid.UUID,
	in PayInput,
) (CreditWithSummary, error) {
	c, err := s.credits.GetCredit(ctx, creditID)
	if err != nil {
		return CreditWithSummary{}, err
	}
	if c.GroupID != groupID {
		return CreditWithSummary{}, core_errors.ErrCreditNotFound
	}
	if c.IsClosed {
		return CreditWithSummary{}, fmt.Errorf("credit already closed: %w", core_errors.ErrInvalidArgument)
	}

	if in.Amount <= 0 {
		return CreditWithSummary{}, fmt.Errorf("amount must be > 0: %w", core_errors.ErrInvalidArgument)
	}
	if in.PaymentDate.IsZero() {
		in.PaymentDate = time.Now()
	}

	// Рассчитываем текущий остаток
	existingPayments, err := s.credits.ListPayments(ctx, creditID)
	if err != nil {
		return CreditWithSummary{}, fmt.Errorf("list payments: %w", err)
	}

	var paidPrincipal float64
	for _, p := range existingPayments {
		paidPrincipal += p.PrincipalPart
	}
	remainingPrincipal := c.Principal - paidPrincipal
	if remainingPrincipal <= 0 {
		return CreditWithSummary{}, fmt.Errorf("credit already fully paid: %w", core_errors.ErrInvalidArgument)
	}

	// Разбиваем платёж на тело и проценты
	monthlyRate := c.AnnualRate / 100.0 / 12.0
	interestPart := round2(remainingPrincipal * monthlyRate)

	// Защита: для дифференцированного reduce_payment не поддерживается (банк уменьшает срок)
	if in.IsEarly && c.PaymentType == domain.CreditPaymentTypeDifferentiated &&
		in.EarlyRecalc != nil && *in.EarlyRecalc == domain.CreditEarlyRecalcReducePayment {
		return CreditWithSummary{}, fmt.Errorf("reduce_payment not supported for differentiated: %w", core_errors.ErrInvalidArgument)
	}

	var principalPart, totalAmount float64
	if in.IsEarly {
		if in.Amount <= interestPart {
			return CreditWithSummary{}, fmt.Errorf("amount must exceed monthly interest (%.2f): %w", interestPart, core_errors.ErrInvalidArgument)
		}
		rawPrincipal := round2(in.Amount - interestPart)
		if rawPrincipal > remainingPrincipal {
			// Переплата: закрываем кредит полностью, не пишем лишнее в principal_part
			principalPart = remainingPrincipal
			totalAmount = round2(principalPart + interestPart)
		} else {
			principalPart = rawPrincipal
			totalAmount = in.Amount
		}
	} else {
		// Берём ТЕКУЩИЙ платёж из графика (учитывает reduce_payment досрочки)
		scheduleForPay := BuildSchedule(c, existingPayments)
		var currentPayment float64
		for _, e := range scheduleForPay {
			if !e.IsPaid {
				currentPayment = e.Amount
				break
			}
		}
		if currentPayment <= 0 {
			currentPayment = CalculateMonthlyPayment(c)
		}
		if currentPayment <= 0 {
			return CreditWithSummary{}, fmt.Errorf("invalid monthly payment: %w", core_errors.ErrInvalidArgument)
		}

		principalPart = round2(currentPayment - interestPart)
		// Защита: последний платёж или аномалии — не уходим в минус
		if principalPart < 0 {
			principalPart = 0
		}
		if principalPart > remainingPrincipal {
			principalPart = remainingPrincipal
		}
		totalAmount = round2(principalPart + interestPart)
	}

	// Если остаток после этого платежа ≤ 0 — кредит закроется
	willClose := round2(remainingPrincipal-principalPart) <= 0.01

	// Сначала записываем сам платёж (кредит — источник истины).
	paymentType := domain.CreditPaymentKindRegular
	if in.IsEarly {
		paymentType = domain.CreditPaymentKindEarly
	}
	p := domain.CreditPayment{
		CreditID:      creditID,
		Amount:        totalAmount,
		PrincipalPart: principalPart,
		InterestPart:  interestPart,
		PaymentDate:   in.PaymentDate,
		Type:          paymentType,
		EarlyRecalc:   in.EarlyRecalc,
	}
	created, err := s.credits.CreatePayment(ctx, p)
	if err != nil {
		return CreditWithSummary{}, fmt.Errorf("create payment: %w", err)
	}

	// Потом — опционально — транзакция в бюджете. Если упадёт, платёж остаётся.
	if in.AccountInBudget && in.CategoryID != nil {
		_, err := s.budget.CreateTransaction(ctx, domain.Transaction{
			Type:        domain.TransactionTypeExpense,
			GroupID:     groupID,
			UserID:      userID,
			CategoryID:  *in.CategoryID,
			Amount:      totalAmount,
			Date:        in.PaymentDate,
			Description: in.Description,
		})
		if err != nil {
			s.logger.Error("create credit transaction failed", zap.Error(err), zap.String("payment_id", created.ID.String()))
		}
	}

	// Если полностью погашен — помечаем
	if willClose {
		if updated, err := s.credits.CloseCredit(ctx, creditID); err == nil {
			c = updated
		}
	}

	// Пересчитываем summary
	newPayments, err := s.credits.ListPayments(ctx, creditID)
	if err != nil {
		return CreditWithSummary{}, fmt.Errorf("reload payments: %w", err)
	}
	schedule := BuildSchedule(c, newPayments)
	summary := CalcSummary(c, newPayments, schedule)
	return CreditWithSummary{Credit: c, Summary: summary}, nil
}
