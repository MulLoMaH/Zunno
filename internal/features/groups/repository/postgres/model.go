package groups_postgres_repository

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type GroupModel struct {
	ID        uuid.UUID
	Version   int64
	Name      string
	OwnerID   uuid.UUID
	CreatedAt time.Time
}

type MembershipModel struct {
	UserID   uuid.UUID
	GroupID  uuid.UUID
	Role     string
	Status   string
	JoinedAt time.Time
}

func groupFromModel(m GroupModel) domain.Group {
	return domain.Group{
		ID:        m.ID,
		Version:   m.Version,
		Name:      m.Name,
		OwnerID:   m.OwnerID,
		CreatedAt: m.CreatedAt,
	}
}

func membershipFromModel(m MembershipModel) domain.Membership {
	return domain.Membership{
		UserID:   m.UserID,
		GroupID:  m.GroupID,
		Role:     m.Role,
		Status:   m.Status,
		JoinedAt: m.JoinedAt,
	}
}
