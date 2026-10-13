package core_errors

import "errors"

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrPhoneTaken         = errors.New("phone already registered")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidArgument    = errors.New("invalid argument")
	ErrRefreshNotFound    = errors.New("refresh token not found")
	ErrConflict           = errors.New("conflict")
)
