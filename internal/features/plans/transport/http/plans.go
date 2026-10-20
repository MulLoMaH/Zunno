package plan_transport_http

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	plan_service "github.com/MulLoMaH/Zunno/internal/features/plans/service"
)

type CreatePlanRequest struct {
	Title           string     `json:"title"`
	Description     string     `json:"description"`
	EventDate       time.Time  `json:"event_date"`
	RecurrenceRule  *string    `json:"recurrence_rule,omitempty"`
	RecurrenceUntil *time.Time `json:"recurrence_until,omitempty"`
}

type UpdatePlanRequest struct {
	Title       string    `json:"title"`
	Description string    `json:"description"`
	EventDate   time.Time `json:"event_date"`
	IsDone      bool      `json:"is_done"`
	Version     int64     `json:"version"`
}

func (h *PlansHTTPHandler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	var recurrence *plan_service.RecurrenceInput
	if req.RecurrenceRule != nil {
		recurrence = &plan_service.RecurrenceInput{
			Rule:  *req.RecurrenceRule,
			Until: req.RecurrenceUntil,
		}
	}

	plan, err := h.planService.CreatePlan(ctx, info.GroupID, info.UserID, req.Title, req.Description, req.EventDate, recurrence)
	if err != nil {
		responseHandler.ErrorResponse(err, "create plan")
		return
	}
	responseHandler.JSONResponse(planDTOFromDomain(plan), http.StatusCreated)
}

func (h *PlansHTTPHandler) GetPlans(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	q := r.URL.Query()
	fromStr := q.Get("from")
	toStr := q.Get("to")
	if fromStr == "" || toStr == "" {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "from and to are required")
		return
	}

	from, err := time.Parse(time.RFC3339, fromStr)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid from")
		return
	}
	to, err := time.Parse(time.RFC3339, toStr)
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid to")
		return
	}

	plans, err := h.planService.GetPlans(ctx, info.GroupID, from, to)
	if err != nil {
		responseHandler.ErrorResponse(err, "get plans")
		return
	}
	responseHandler.JSONResponse(plansDTOsFromDomains(plans), http.StatusOK)
}

func (h *PlansHTTPHandler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
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

	var req UpdatePlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	plan, err := h.planService.UpdatePlan(ctx, info.GroupID, planID, req.Title, req.Description, req.EventDate, req.IsDone, req.Version)
	if err != nil {
		responseHandler.ErrorResponse(err, "update plan")
		return
	}
	responseHandler.JSONResponse(planDTOFromDomain(plan), http.StatusOK)
}

func (h *PlansHTTPHandler) DeletePlan(w http.ResponseWriter, r *http.Request) {
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

	if err := h.planService.DeletePlan(ctx, info.GroupID, planID); err != nil {
		responseHandler.ErrorResponse(err, "delete plan")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
