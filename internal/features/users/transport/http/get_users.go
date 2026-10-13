package user_transport_http

import (
	"fmt"
	"net/http"

	core_logger "github.com/MulLoMaH/Zunno/internal/core/logger"
	core_http_response "github.com/MulLoMaH/Zunno/internal/core/transport/http/response"
	core_http_utils "github.com/MulLoMaH/Zunno/internal/core/transport/http/utils"
)

type GetUsersResponse []UserDTOResponse

func (h *UsersHTTPHandler) GetUsers(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHendler := core_http_response.NewHTTPResponseHendler(log, rw)

	limit, offset, err := getLimitOffsetQueryParams(r)
	if err != nil {
		responseHendler.ErrorResponse(err, "get limit and offset query params")
		return
	}

	usersDomain, err := h.userService.GetUsers(ctx, limit, offset)
	if err != nil {
		responseHendler.ErrorResponse(err, "get users")
		return
	}

	response := GetUsersResponse(usersDTOsFromDomains(usersDomain))
	responseHendler.JSONResponse(response, http.StatusOK)
}

func getLimitOffsetQueryParams(r *http.Request) (*int, *int, error) {
	limit, err := core_http_utils.GetIntQueryParam(r, "limit")
	if err != nil {
		return nil, nil, fmt.Errorf("get limit query param: %w", err)
	}

	offset, err := core_http_utils.GetIntQueryParam(r, "offset")
	if err != nil {
		return nil, nil, fmt.Errorf("get offset query param: %w", err)
	}

	return limit, offset, nil
}
