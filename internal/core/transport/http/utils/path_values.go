package core_http_utils

import (
	"fmt"
	"net/http"

	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	"github.com/google/uuid"
)

func GetIntPathValue(r *http.Request, key string) (string, error) {
	pathValue := r.PathValue(key)

	if pathValue == "" {
		return "", fmt.Errorf(
			"no key='%s, in path values: %w",
			pathValue,
			core_errors.ErrInvalidArgument,
		)
	}

	// val, err := strconv.Atoi(pathValue)
	// if err != nil {
	// 	return 0, fmt.Errorf(
	// 		"path value='%s', by key:'%s' not a valid integer: %v: %w",
	// 		pathValue,
	// 		key,
	// 		err,
	// 		core_errors.ErrInvalidArgument,
	// 	)
	// }

	return pathValue, nil
}

func GetAndValidatePathValueByID(r *http.Request, key string) (uuid.UUID, error) {
	raw := r.PathValue(key)
	if raw == "" {
		return uuid.Nil, fmt.Errorf(
			"no key='%s' in path values: %w",
			key,
			core_errors.ErrInvalidArgument,
		)
	}

	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf(
			"invalid uuid '%s': %w",
			raw,
			core_errors.ErrInvalidArgument,
		)
	}

	if id == uuid.Nil {
		return uuid.Nil, fmt.Errorf(
			"uuid must not be nil: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	return id, nil
}
