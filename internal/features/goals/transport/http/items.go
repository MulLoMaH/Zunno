package goal_transport_http

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_middleware "github.com/MulLoMaH/Zunno/internal/core/transport/http/middleware"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
)

type CreateItemRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type MarkItemDoneRequest struct {
	Done    bool  `json:"done"`
	Version int64 `json:"version"`
}

func (h *GoalsHTTPHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	catID, err := uuid.Parse(r.PathValue("catId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid category id")
		return
	}

	var req CreateItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	item, err := h.goalService.CreateGoalItem(ctx, info.GroupID, catID, req.Title, req.Description)
	if err != nil {
		responseHandler.ErrorResponse(err, "create item")
		return
	}

	responseHandler.JSONResponse(itemDTOFromDomain(item), http.StatusCreated)
}

func (h *GoalsHTTPHandler) GetItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	catID, err := uuid.Parse(r.PathValue("catId"))
	if err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "invalid category id")
		return
	}

	items, err := h.goalService.GetGoalItems(ctx, info.GroupID, catID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get items")
		return
	}

	responseHandler.JSONResponse(itemsDTOsFromDomains(items), http.StatusOK)
}

func (h *GoalsHTTPHandler) MarkItemDone(w http.ResponseWriter, r *http.Request) {
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

	var req MarkItemDoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	item, err := h.goalService.MarkGoalItemDone(ctx, info.GroupID, itemID, req.Done, req.Version)
	if err != nil {
		responseHandler.ErrorResponse(err, "mark item done")
		return
	}

	responseHandler.JSONResponse(itemDTOFromDomain(item), http.StatusOK)
}

func (h *GoalsHTTPHandler) DeleteItem(w http.ResponseWriter, r *http.Request) {
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

	if err := h.goalService.DeleteGoalItem(ctx, info.GroupID, itemID); err != nil {
		responseHandler.ErrorResponse(err, "delete item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
