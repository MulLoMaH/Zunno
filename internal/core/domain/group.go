package domain

import (
	"time"

	"github.com/google/uuid"
)

const (
	GroupRoleAdmin  = "admin"
	GroupRoleMember = "member"

	MembershipStatusPending = "pending"
	MembershipStatusActive  = "active"
)

type Group struct {
	ID        uuid.UUID
	Version   int64
	Name      string
	OwnerID   uuid.UUID
	CreatedAt time.Time
}

type Membership struct {
	UserID   uuid.UUID
	GroupID  uuid.UUID
	Role     string
	Status   string
	JoinedAt time.Time
}
