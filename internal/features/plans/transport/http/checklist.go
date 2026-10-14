package plan_transport_http

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type CreateChecklistRequest struct {
	Text string `json:"text"`
}

type UpdateChecklistRequest struct {
	Text      string `json:"text"`
	IsChecked bool   `json:"is_checked"`
	Version   int64  `json:"version"`
}

func (h *PlansHTTPHandler) CreateChecklist(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, err := uuid.Parse(r.PathValue("planId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid plan id")
		return
	}

	var req CreateChecklistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	item, err := h.planService.CreateChecklistItem(ctx, info.GroupID, planID, req.Text)
	if err != nil {
		responseHandler.ErrorResponse(err, "create checklist")
		return
	}
	responseHandler.JSONResponse(checklistDTOFromDomain(item), http.StatusCreated)
}

func (h *PlansHTTPHandler) GetChecklist(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, err := uuid.Parse(r.PathValue("planId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid plan id")
		return
	}

	items, err := h.planService.GetChecklist(ctx, info.GroupID, planID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get checklist")
		return
	}
	responseHandler.JSONResponse(checklistDTOsFromDomains(items), http.StatusOK)
}

func (h *PlansHTTPHandler) UpdateChecklist(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	itemID, err := uuid.Parse(r.PathValue("itemId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid item id")
		return
	}

	var req UpdateChecklistRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	item, err := h.planService.UpdateChecklistItem(ctx, info.GroupID, itemID, req.Text, req.IsChecked, req.Version)
	if err != nil {
		responseHandler.ErrorResponse(err, "update checklist")
		return
	}
	responseHandler.JSONResponse(checklistDTOFromDomain(item), http.StatusOK)
}

func (h *PlansHTTPHandler) DeleteChecklist(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	itemID, err := uuid.Parse(r.PathValue("itemId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid item id")
		return
	}

	if err := h.planService.DeleteChecklistItem(ctx, info.GroupID, itemID); err != nil {
		responseHandler.ErrorResponse(err, "delete checklist")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
