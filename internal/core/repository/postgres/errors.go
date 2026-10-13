package core_postgres_pool

import "errors"

var (
	ErrNoRows             = errors.New("no rows")
	ErrViolatesForeignKey = errors.New("violates forein key")
	ErrUnknown            = errors.New("unknown")
)
