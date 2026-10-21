package budget_transport_http

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	budget_service "github.com/MulLoMaH/Zunno/internal/features/joint_budget/service"
)

type SplitTransactionRequest struct {
	CategoryID     uuid.UUID   `json:"category_id"`
	Amount         float64     `json:"amount"`
	Date           *time.Time  `json:"date,omitempty"`
	Description    string      `json:"description"`
	ParticipantIDs []uuid.UUID `json:"participant_ids"`
}

type DebtDTOResponse struct {
	ID            uuid.UUID  `json:"id"`
	GroupID       uuid.UUID  `json:"group_id"`
	TransactionID *uuid.UUID `json:"transaction_id,omitempty"`
	CreditorID    uuid.UUID  `json:"creditor_id"`
	CreditorName  string     `json:"creditor_name,omitempty"`
	DebtorID      uuid.UUID  `json:"debtor_id"`
	DebtorName    string     `json:"debtor_name,omitempty"`
	Amount        float64    `json:"amount"`
	IsPaid        bool       `json:"is_paid"`
	CreatedAt     time.Time  `json:"created_at"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
}

type SplitTransactionResponse struct {
	Transaction TransactionDTOResponse `json:"transaction"`
	Debts       []DebtDTOResponse      `json:"debts"`
}

func debtDTOFromDomain(d domain.Debt) DebtDTOResponse {
	return DebtDTOResponse{
		ID:            d.ID,
		GroupID:       d.GroupID,
		TransactionID: d.TransactionID,
		CreditorID:    d.CreditorID,
		CreditorName:  d.CreditorName,
		DebtorID:      d.DebtorID,
		DebtorName:    d.DebtorName,
		Amount:        d.Amount,
		IsPaid:        d.IsPaid,
		CreatedAt:     d.CreatedAt,
		PaidAt:        d.PaidAt,
	}
}

// SplitTransaction — POST /groups/{id}/transactions/split
func (h *BudgetHTTPHandler) SplitTransaction(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req SplitTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	date := time.Now()
	if req.Date != nil {
		date = *req.Date
	}

	tx, debts, err := h.budgetService.SplitTransaction(
		ctx,
		info.GroupID,
		info.UserID,
		budget_service.SplitInput{
			CategoryID:     req.CategoryID,
			Amount:         req.Amount,
			Date:           date,
			Description:    req.Description,
			ParticipantIDs: req.ParticipantIDs,
		},
	)
	if err != nil {
		responseHandler.ErrorResponse(err, "split transaction")
		return
	}

	resp := SplitTransactionResponse{
		Transaction: transactionDTOFromDomain(tx),
		Debts:       make([]DebtDTOResponse, len(debts)),
	}
	for i, d := range debts {
		resp.Debts[i] = debtDTOFromDomain(d)
	}

	responseHandler.JSONResponse(resp, http.StatusCreated)
}
