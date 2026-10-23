package recurring_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

func (h *RecurringHTTPHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreateRecurringRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	rt, err := h.service.Create(ctx, info.GroupID, info.UserID, req.toServiceInput())
	if err != nil {
		resp.ErrorResponse(err, "create recurring")
		return
	}
	resp.JSONResponse(recurringDTOFromDomain(rt), http.StatusCreated)
}

func (h *RecurringHTTPHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	items, err := h.service.List(ctx, info.GroupID)
	if err != nil {
		resp.ErrorResponse(err, "list recurrings")
		return
	}
	resp.JSONResponse(recurringsDTOFromDomains(items), http.StatusOK)
}

func (h *RecurringHTTPHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	recID, err := uuid.Parse(r.PathValue("recId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid recurring id")
		return
	}

	rt, err := h.service.Get(ctx, info.GroupID, recID)
	if err != nil {
		resp.ErrorResponse(err, "get recurring")
		return
	}
	resp.JSONResponse(recurringDTOFromDomain(rt), http.StatusOK)
}

func (h *RecurringHTTPHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	recID, err := uuid.Parse(r.PathValue("recId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid recurring id")
		return
	}

	var req UpdateRecurringRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	rt, err := h.service.Update(ctx, info.GroupID, recID, req.toServiceInput(), req.IsActive)
	if err != nil {
		resp.ErrorResponse(err, "update recurring")
		return
	}
	resp.JSONResponse(recurringDTOFromDomain(rt), http.StatusOK)
}

func (h *RecurringHTTPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	recID, err := uuid.Parse(r.PathValue("recId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid recurring id")
		return
	}

	if err := h.service.Delete(ctx, info.GroupID, recID); err != nil {
		resp.ErrorResponse(err, "delete recurring")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
