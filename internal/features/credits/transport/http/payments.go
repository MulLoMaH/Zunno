package credits_transport_http

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
	credits_service "github.com/MulLoMaH/Zunno/internal/features/credits/service"
)

// Pay — POST /groups/{id}/credits/{creditId}/pay
func (h *CreditsHTTPHandler) Pay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	creditID, err := uuid.Parse(r.PathValue("creditId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid credit id")
		return
	}

	var req PayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	payDate := time.Now()
	if req.PaymentDate != nil {
		payDate = *req.PaymentDate
	}

	result, err := h.creditService.Pay(ctx, info.GroupID, info.UserID, creditID, credits_service.PayInput{
		Amount:          req.Amount,
		PaymentDate:     payDate,
		IsEarly:         false,
		CategoryID:      req.CategoryID,
		AccountInBudget: req.AccountInBudget,
		Description:     req.Description,
	})
	if err != nil {
		resp.ErrorResponse(err, "pay credit")
		return
	}
	resp.JSONResponse(creditWithSummaryDTO(result), http.StatusOK)
}

// EarlyPay — POST /groups/{id}/credits/{creditId}/early-pay
func (h *CreditsHTTPHandler) EarlyPay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	creditID, err := uuid.Parse(r.PathValue("creditId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid credit id")
		return
	}

	var req EarlyPayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if req.EarlyRecalc != domain.CreditEarlyRecalcReduceTerm &&
		req.EarlyRecalc != domain.CreditEarlyRecalcReducePayment {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "early_recalc must be reduce_term or reduce_payment")
		return
	}

	payDate := time.Now()
	if req.PaymentDate != nil {
		payDate = *req.PaymentDate
	}

	result, err := h.creditService.Pay(ctx, info.GroupID, info.UserID, creditID, credits_service.PayInput{
		Amount:          req.Amount,
		PaymentDate:     payDate,
		IsEarly:         true,
		EarlyRecalc:     &req.EarlyRecalc,
		CategoryID:      req.CategoryID,
		AccountInBudget: req.AccountInBudget,
		Description:     req.Description,
	})
	if err != nil {
		resp.ErrorResponse(err, "early pay credit")
		return
	}
	resp.JSONResponse(creditWithSummaryDTO(result), http.StatusOK)
}
