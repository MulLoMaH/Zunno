package core_http_utils

import (
	"fmt"
	"net/http"
	"strconv"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

func GetIntQueryParam(r *http.Request, key string) (*int, error) {
	value := r.URL.Query().Get(key)
	if value == "" {
		return nil, nil
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		return nil, fmt.Errorf(
			"param=`%s`: invalid integer value for key=`%s` valid for integer: %v: %w",
			value,
			key,
			err,
			core_errors.ErrInvalidArgument,
		)
	}
	return &intValue, nil
}
