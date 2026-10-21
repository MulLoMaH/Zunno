package credits_service

import (
	"sort"
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

// ScheduleEntry — один месяц в графике.
type ScheduleEntry struct {
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

// CreditSummary — агрегат по кредиту для UI.
type CreditSummary struct {
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

// BuildSchedule строит расчётный график с учётом фактических платежей и досрочек.
//
// Логика:
//   - Идём по месяцам от startDate.
//   - На каждом месяце: если есть фактический платёж — используем его данные (реальный principal/interest).
//   - Если платежа нет — считаем по формуле (аннуитет/дифференцированный) от текущего остатка.
//   - Для досрочек: если стратегия reduce_term — платёж остаётся прежним, оставшиеся месяцы сокращаются.
//     если reduce_payment — пересчитываем платёж, срок тот же.
//   - Если остаток ≤ 0 — кредит закрыт досрочно.
func BuildSchedule(credit domain.Credit, payments []domain.CreditPayment) []ScheduleEntry {
	// Сортируем платежи по дате
	sorted := make([]domain.CreditPayment, len(payments))
	copy(sorted, payments)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].PaymentDate.Before(sorted[j].PaymentDate)
	})

	// Группируем платежи по индексу месяца (месяц = (payment_date - start_date) в месяцах)
	// Более точный подход: для каждого месяца проверяем, есть ли платёж в этом месяце.
	paymentsByMonth := make(map[int][]domain.CreditPayment)
	for _, p := range sorted {
		m := monthsBetween(credit.StartDate, p.PaymentDate)
		paymentsByMonth[m] = append(paymentsByMonth[m], p)
	}

	remaining := credit.Principal
	now := time.Now()
	totalPayments := credit.TermMonths
	schedule := make([]ScheduleEntry, 0, totalPayments)

	// Месячный платёж (базовый — для аннуитета).
	baseMonthly := CalculateMonthlyPayment(credit)
	effectiveTerm := credit.TermMonths // может сократиться при досрочках reduce_term
	monthlyPayment := baseMonthly

	for month := 0; month <= effectiveTerm && remaining > 0.01; month++ {
		date := AddMonths(credit.StartDate, month)
		monthPayments := paymentsByMonth[month]

		// Итоги по фактическим платежам в этом месяце
		var factPrincipal, factInterest, factAmount float64
		var isPaid bool
		var firstPaymentID string
		for _, p := range monthPayments {
			factPrincipal += p.PrincipalPart
			factInterest += p.InterestPart
			factAmount += p.Amount
			isPaid = true
			if firstPaymentID == "" {
				firstPaymentID = p.ID.String()
			}
		}

		var principalPart, interestPart, amount float64
		if isPaid {
			principalPart = factPrincipal
			interestPart = factInterest
			amount = factAmount
		} else {
			// Расчётный платёж
			r := credit.AnnualRate / 100.0 / 12.0
			interestPart = round2(remaining * r)

			switch credit.PaymentType {
			case domain.CreditPaymentTypeAnnuity:
				if monthlyPayment <= 0 {
					amount = 0
				} else {
					amount = round2(monthlyPayment)
				}
				principalPart = round2(amount - interestPart)
			case domain.CreditPaymentTypeDifferentiated:
				bodyPart := round2(credit.Principal / float64(credit.TermMonths))
				principalPart = bodyPart
				amount = round2(principalPart + interestPart)
			}

			// Защита: principalPart не может быть отрицательным или превышать остаток
			if principalPart < 0 {
				principalPart = 0
				amount = round2(principalPart + interestPart)
			}
			if principalPart > remaining {
				principalPart = remaining
				amount = round2(principalPart + interestPart)
			}
		}

		// Уменьшаем остаток
		remaining = round2(remaining - principalPart)
		if remaining < 0 {
			remaining = 0
		}

		// Обрабатываем досрочки в этом месяце
		for _, p := range monthPayments {
			if p.Type == domain.CreditPaymentKindEarly && p.EarlyRecalc != nil {
				// Early_recalc влияет на оставшийся срок/платёж:
				//   reduce_term    — срок сокращается (платёж тот же)
				//   reduce_payment — платёж уменьшается (срок тот же)
				// В упрощённой модели: при reduce_payment пересчитаем monthlyPayment
				// от нового остатка на оставшиеся месяцы (effectiveTerm - month).
				if *p.EarlyRecalc == domain.CreditEarlyRecalcReducePayment {
					monthsLeft := effectiveTerm - month
					if monthsLeft > 0 && remaining > 0 {
						newMonthly := CalculateAnnuityPayment(remaining, credit.AnnualRate, monthsLeft)
						if newMonthly > 0 {
							monthlyPayment = newMonthly
						}
					}
				}
				// reduce_term: не трогаем monthlyPayment, но уменьшаем effectiveTerm
				// на основе нового остатка — считаем сколько месяцев осталось платить
				if *p.EarlyRecalc == domain.CreditEarlyRecalcReduceTerm {
					if remaining <= 0.01 {
						effectiveTerm = month
						break
					}
					// Если платёж не покрывает остаток — сокращаем срок
					if monthlyPayment > 0 {
						// ~ сколько месяцев осталось при текущем платеже
						r := credit.AnnualRate / 100.0 / 12.0
						if r == 0 {
							leftMonths := int(remaining / monthlyPayment)
							if float64(leftMonths)*monthlyPayment < remaining {
								leftMonths++
							}
							effectiveTerm = month + leftMonths
						}
					}
				}
			}
		}

		schedule = append(schedule, ScheduleEntry{
			Month:         month + 1,
			Date:          date,
			Amount:        round2(amount),
			PrincipalPart: round2(principalPart),
			InterestPart:  round2(interestPart),
			Remaining:     round2(remaining),
			IsPaid:        isPaid,
			IsPast:        date.Before(now),
			PaymentID:     firstPaymentID,
		})

		// Если полностью погасили — выходим
		if remaining <= 0.01 {
			break
		}
	}

	return schedule
}

// CalcSummary — агрегированные цифры для UI.
func CalcSummary(credit domain.Credit, payments []domain.CreditPayment, schedule []ScheduleEntry) CreditSummary {
	var paidPrincipal, paidInterest, totalPaid float64
	for _, p := range payments {
		paidPrincipal += p.PrincipalPart
		paidInterest += p.InterestPart
		totalPaid += p.Amount
	}

	remainingPrincipal := round2(credit.Principal - paidPrincipal)
	if remainingPrincipal < 0 {
		remainingPrincipal = 0
	}

	var remainingInterest float64
	var nextDate *time.Time
	var nextAmount float64
	for _, e := range schedule {
		if !e.IsPaid {
			remainingInterest += e.InterestPart
			if nextDate == nil && !e.IsPast {
				d := e.Date
				nextDate = &d
				nextAmount = e.Amount
			}
		}
	}

	// Если все прошедшие — берём последний unpaid
	if nextDate == nil {
		for _, e := range schedule {
			if !e.IsPaid {
				d := e.Date
				nextDate = &d
				nextAmount = e.Amount
			}
		}
	}

	progress := 0.0
	if credit.Principal > 0 {
		progress = round2(paidPrincipal / credit.Principal * 100)
		if progress > 100 {
			progress = 100
		}
	}

	expectedEnd := AddMonths(credit.StartDate, credit.TermMonths)
	if len(schedule) > 0 {
		expectedEnd = schedule[len(schedule)-1].Date
	}

	// Текущий платёж берём из первой неоплаченной строки (учитывает досрочки reduce_payment).
	var currentMonthly float64
	for _, e := range schedule {
		if !e.IsPaid {
			currentMonthly = e.Amount
			break
		}
	}
	if currentMonthly == 0 {
		currentMonthly = CalculateMonthlyPayment(credit)
	}

	return CreditSummary{
		MonthlyPayment:     round2(currentMonthly),
		TotalPaid:          round2(totalPaid),
		PaidPrincipal:      round2(paidPrincipal),
		PaidInterest:       round2(paidInterest),
		RemainingPrincipal: remainingPrincipal,
		RemainingInterest:  round2(remainingInterest),
		TotalOverpayment:   round2(paidInterest + remainingInterest),
		ProgressPercent:    progress,
		NextPaymentDate:    nextDate,
		NextPaymentAmount:  round2(nextAmount),
		PaymentsCount:      len(payments),
		ExpectedEndDate:    expectedEnd,
		IsClosed:           credit.IsClosed,
	}
}

// monthsBetween — сколько целых календарных месяцев между двумя датами.
func monthsBetween(from, to time.Time) int {
	y1, m1, d1 := from.Date()
	y2, m2, d2 := to.Date()
	months := (y2-y1)*12 + int(m2) - int(m1)
	if d2 < d1 {
		months--
	}
	if months < 0 {
		return 0
	}
	return months
}
