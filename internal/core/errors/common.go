package core_errors

import "errors"

var (
	ErrUserNotFound         = errors.New("user not found")
	ErrPhoneTaken           = errors.New("phone already registered")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrInvalidToken         = errors.New("invalid or expired token")
	ErrInvalidArgument      = errors.New("invalid argument")
	ErrRefreshNotFound      = errors.New("refresh token not found")
	ErrConflict             = errors.New("conflict")
	ErrForbidden            = errors.New("forbidden")
	ErrGroupNotFound        = errors.New("group not found")
	ErrNotGroupMember       = errors.New("not a group member")
	ErrNotGroupAdmin        = errors.New("not a group admin")
	ErrAlreadyMember        = errors.New("already a member")
	ErrInviteNotFound       = errors.New("invitation not found")
	ErrGoalCategoryNotFound = errors.New("goal category not found")
	ErrGoalItemNotFound     = errors.New("goal item not found")
	ErrCategoryNotFound     = errors.New("category not found")
	ErrTransactionNotFound  = errors.New("transaction not found")
	ErrStatsTimeout         = errors.New("statistics not ready yet")
	ErrPlanNotFound         = errors.New("plan not found")
	ErrRecurringNotFound    = errors.New("recurring transaction not found")
	ErrChecklistNotFound    = errors.New("checklist item not found")
	ErrCreditNotFound       = errors.New("credit not found")
)
