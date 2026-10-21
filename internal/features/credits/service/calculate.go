package credits_service

import (
	"math"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

// CalculateAnnuityPayment — месячный платёж при аннуитете.
// Формула: P * (r * (1+r)^n) / ((1+r)^n - 1), где r = annualRate/100/12.
func CalculateAnnuityPayment(principal, annualRate float64, termMonths int) float64 {
	if termMonths <= 0 || principal <= 0 {
		return 0
	}
	if annualRate == 0 {
		return round2(principal / float64(termMonths))
	}
	r := annualRate / 100.0 / 12.0
	factor := math.Pow(1+r, float64(termMonths))
	return round2(principal * r * factor / (factor - 1))
}

// CalculateDifferentiatedPayment — месячный платёж в месяце n (1-indexed)
// при дифференцированном типе.
// Формула: principal/n + (principal - (n-1)*principal/n) * r.
func CalculateDifferentiatedPayment(principal, annualRate float64, termMonths, month int) float64 {
	if termMonths <= 0 || principal <= 0 || month < 1 || month > termMonths {
		return 0
	}
	body := principal / float64(termMonths)
	remaining := principal - body*float64(month-1)
	r := annualRate / 100.0 / 12.0
	return round2(body + remaining*r)
}

// CalculateMonthlyPayment — обёртка: выбирает формулу по типу.
func CalculateMonthlyPayment(c domain.Credit) float64 {
	switch c.PaymentType {
	case domain.CreditPaymentTypeAnnuity:
		return CalculateAnnuityPayment(c.Principal, c.AnnualRate, c.TermMonths)
	case domain.CreditPaymentTypeDifferentiated:
		return CalculateDifferentiatedPayment(c.Principal, c.AnnualRate, c.TermMonths, 1)
	default:
		return 0
	}
}

// AddMonths — дата + N календарных месяцев (с сохранением дня, насколько возможно).
func AddMonths(t time.Time, months int) time.Time {
	y, m, d := t.Date()
	// сохраняем день, но обрезаем до последнего дня месяца
	newMonth := time.Month(int(m) + months)
	yearOffset := 0
	for newMonth > 12 {
		newMonth -= 12
		yearOffset++
	}
	for newMonth < 1 {
		newMonth += 12
		yearOffset--
	}
	result := time.Date(y+yearOffset, newMonth, 1, 12, 0, 0, 0, t.Location())
	lastDay := time.Date(result.Year(), result.Month()+1, 0, 12, 0, 0, 0, t.Location()).Day()
	if d > lastDay {
		d = lastDay
	}
	return time.Date(result.Year(), result.Month(), d, 12, 0, 0, 0, t.Location())
}

// round2 — округление до копеек.
func round2(x float64) float64 {
	return math.Round(x*100) / 100
}
