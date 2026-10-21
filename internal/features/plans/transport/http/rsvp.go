package plan_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	"github.com/google/uuid"
)

type RSVPRequest struct {
	Status string `json:"status"`
}

func (h *PlansHTTPHandler) SetRSVP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, _ := uuid.Parse(r.PathValue("planId"))

	var req RSVPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	if err := h.planService.SetRSVP(ctx, info.GroupID, planID, info.UserID, req.Status); err != nil {
		responseHandler.ErrorResponse(err, "set rsvp")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PlansHTTPHandler) GetRSVPs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	planID, _ := uuid.Parse(r.PathValue("planId"))

	rsvps, err := h.planService.GetRSVPs(ctx, info.GroupID, planID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get rsvps")
		return
	}
	responseHandler.JSONResponse(rsvps, http.StatusOK)
}
