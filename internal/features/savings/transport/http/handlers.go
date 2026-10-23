package savings_transport_http

import (
	"encoding/json"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	savings_service "github.com/MulLoMaH/Zunno/internal/features/savings/service"
	"github.com/google/uuid"
)

func (h *SavingsHTTPHandler) GetWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	wallet, err := h.service.GetWallet(ctx, info.GroupID)
	if err != nil {
		resp.ErrorResponse(err, "get wallet")
		return
	}
	resp.JSONResponse(walletDTOFromDomain(wallet), http.StatusOK)
}

func (h *SavingsHTTPHandler) CreateGoal(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	goal, err := h.service.CreateGoal(ctx, info.GroupID, savings_service.CreateGoalInput{
		Name:         req.Name,
		TargetAmount: req.TargetAmount,
		Icon:         req.Icon,
		Color:        req.Color,
	})
	if err != nil {
		resp.ErrorResponse(err, "create goal")
		return
	}
	resp.JSONResponse(goalDTOFromDomain(goal), http.StatusCreated)
}

func (h *SavingsHTTPHandler) ListGoals(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	goals, err := h.service.ListGoals(ctx, info.GroupID)
	if err != nil {
		resp.ErrorResponse(err, "list goals")
		return
	}
	resp.JSONResponse(goalsDTOFromDomains(goals), http.StatusOK)
}

func (h *SavingsHTTPHandler) DeleteGoal(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	goalID, err := uuid.Parse(r.PathValue("goalId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid goal id")
		return
	}

	if err := h.service.DeleteGoal(ctx, info.GroupID, goalID); err != nil {
		resp.ErrorResponse(err, "delete goal")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *SavingsHTTPHandler) Transfer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	resp := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		resp.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	goalID, err := uuid.Parse(r.PathValue("goalId"))
	if err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "invalid goal id")
		return
	}

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		resp.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	wallet, err := h.service.Transfer(ctx, info.GroupID, savings_service.TransferInput{
		UserID:    info.UserID,
		GoalID:    goalID,
		Amount:    req.Amount,
		IsDeposit: req.IsDeposit,
	})
	if err != nil {
		resp.ErrorResponse(err, "transfer")
		return
	}
	resp.JSONResponse(walletDTOFromDomain(wallet), http.StatusOK)
}
