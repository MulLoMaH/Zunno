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

type CreateCategoryRequest struct {
	Name string `json:"name"`
}

type UpdateCategoryRequest struct {
	Name    string `json:"name"`
	Version int64  `json:"version"`
}

func (h *GoalsHTTPHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	cat, err := h.goalService.CreateGoalCategory(ctx, info.GroupID, req.Name)
	if err != nil {
		responseHandler.ErrorResponse(err, "create category")
		return
	}

	responseHandler.JSONResponse(categoryDTOFromDomain(cat), http.StatusCreated)
}

func (h *GoalsHTTPHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHendler(log, w)

	info, ok := core_http_middleware.GroupInfoFrom(ctx)
	if !ok {
		responseHandler.ErrorResponse(core_errors.ErrForbidden, "no group info")
		return
	}

	cats, err := h.goalService.GetGoalCategories(ctx, info.GroupID)
	if err != nil {
		responseHandler.ErrorResponse(err, "get categories")
		return
	}

	responseHandler.JSONResponse(categoriesDTOsFromDomains(cats), http.StatusOK)
}

func (h *GoalsHTTPHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
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

	var req UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		responseHandler.ErrorResponse(core_errors.ErrInvalidArgument, "decode request")
		return
	}

	cat, err := h.goalService.UpdateGoalCategory(ctx, info.GroupID, catID, req.Name, req.Version)
	if err != nil {
		responseHandler.ErrorResponse(err, "update category")
		return
	}

	responseHandler.JSONResponse(categoryDTOFromDomain(cat), http.StatusOK)
}

func (h *GoalsHTTPHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
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

	if err := h.goalService.DeleteGoalCategory(ctx, info.GroupID, catID); err != nil {
		responseHandler.ErrorResponse(err, "delete category")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
