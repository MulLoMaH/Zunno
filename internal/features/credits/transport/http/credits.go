package credits_transport_http

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	credits_service "github.com/MulLoMaH/Zunno/internal/features/credits/service"
)

// Create — POST /groups/{id}/credits
func (h *CreditsHTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreateCreditRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	created, err := h.creditService.CreateCredit(ctx, info.GroupID, info.UserID, credits_service.CreateCreditInput{
		Name:        req.Name,
		Principal:   req.Principal,
		AnnualRate:  req.AnnualRate,
		TermMonths:  req.TermMonths,
		PaymentType: req.PaymentType,
		StartDate:   req.StartDate,
		Currency:    req.Currency,
	})
	if err != nil {
		resp.ErrorResponse(err, "create credit")
		return
	}
	resp.JSONResponse(creditWithSummaryDTO(created), http.StatusCreated)
}

// List — GET /groups/{id}/credits
func (h *CreditsHTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	list, err := h.creditService.ListCredits(ctx, info.GroupID)
	if err != nil {
		resp.ErrorResponse(err, "list credits")
		return
	}
	resp.JSONResponse(creditWithSummariesDTO(list), http.StatusOK)
}

// Detail — GET /groups/{id}/credits/{creditId}
func (h *CreditsHTTPHandler) Detail(w http.ResponseWriter, r *http.Request) {
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

	detail, err := h.creditService.GetCreditDetail(ctx, info.GroupID, creditID)
	if err != nil {
		resp.ErrorResponse(err, "get credit detail")
		return
	}
	resp.JSONResponse(detailDTOFromService(detail), http.StatusOK)
}

// Delete — DELETE /groups/{id}/credits/{creditId}
func (h *CreditsHTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.creditService.DeleteCredit(ctx, info.GroupID, creditID); err != nil {
		resp.ErrorResponse(err, "delete credit")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
