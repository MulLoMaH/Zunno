package savings_transport_http

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type CreateGoalRequest struct {
	Name         string  `json:"name"`
	TargetAmount float64 `json:"target_amount"`
	Icon         string  `json:"icon"`
	Color        string  `json:"color"`
}

type TransferRequest struct {
	Amount    float64 `json:"amount"`
	IsDeposit bool    `json:"is_deposit"`
}

type SavingsGoalDTOResponse struct {
	ID            uuid.UUID `json:"id"`
	Version       int64     `json:"version"`
	GroupID       uuid.UUID `json:"group_id"`
	Name          string    `json:"name"`
	TargetAmount  float64   `json:"target_amount"`
	CurrentAmount float64   `json:"current_amount"`
	Icon          string    `json:"icon"`
	Color         string    `json:"color"`
	Progress      float64   `json:"progress"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type WalletDTOResponse struct {
	GroupID        uuid.UUID `json:"group_id"`
	Balance        float64   `json:"balance"`
	TotalIncome    float64   `json:"total_income"`
	TotalExpense   float64   `json:"total_expense"`
	TotalInSavings float64   `json:"total_in_savings"`
	TransfersTo    float64   `json:"transfers_to"`
	TransfersFrom  float64   `json:"transfers_from"`
}

func goalDTOFromDomain(g domain.SavingsGoal) SavingsGoalDTOResponse {
	progress := 0.0
	if g.TargetAmount > 0 {
		progress = (g.CurrentAmount / g.TargetAmount) * 100
		if progress > 100 {
			progress = 100
		}
	}
	return SavingsGoalDTOResponse{
		ID:            g.ID,
		Version:       g.Version,
		GroupID:       g.GroupID,
		Name:          g.Name,
		TargetAmount:  g.TargetAmount,
		CurrentAmount: g.CurrentAmount,
		Icon:          g.Icon,
		Color:         g.Color,
		Progress:      progress,
		CreatedAt:     g.CreatedAt,
		UpdatedAt:     g.UpdatedAt,
	}
}

func goalsDTOFromDomains(gs []domain.SavingsGoal) []SavingsGoalDTOResponse {
	out := make([]SavingsGoalDTOResponse, len(gs))
	for i, g := range gs {
		out[i] = goalDTOFromDomain(g)
	}
	return out
}

func walletDTOFromDomain(w domain.WalletBalance) WalletDTOResponse {
	return WalletDTOResponse{
		GroupID:        w.GroupID,
		Balance:        w.Balance,
		TotalIncome:    w.TotalIncome,
		TotalExpense:   w.TotalExpense,
		TotalInSavings: w.TotalInSavings,
		TransfersTo:    w.TransfersTo,
		TransfersFrom:  w.TransfersFrom,
	}
}
