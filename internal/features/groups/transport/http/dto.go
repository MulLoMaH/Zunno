package group_transport_http

import (
	"time"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type GroupDTOResponse struct {
	ID        uuid.UUID `json:"id"`
	Version   int64     `json:"version"`
	Name      string    `json:"name"`
	OwnerID   uuid.UUID `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

type MembershipDTOResponse struct {
	UserID   uuid.UUID `json:"user_id"`
	GroupID  uuid.UUID `json:"group_id"`
	Role     string    `json:"role"`
	Status   string    `json:"status"`
	JoinedAt time.Time `json:"joined_at"`
}

func groupDTOFromDomain(g domain.Group) GroupDTOResponse {
	return GroupDTOResponse{
		ID:        g.ID,
		Version:   g.Version,
		Name:      g.Name,
		OwnerID:   g.OwnerID,
		CreatedAt: g.CreatedAt,
	}
}

func groupsDTOsFromDomains(gs []domain.Group) []GroupDTOResponse {
	out := make([]GroupDTOResponse, len(gs))
	for i, g := range gs {
		out[i] = groupDTOFromDomain(g)
	}
	return out
}

func membershipDTOFromDomain(m domain.Membership) MembershipDTOResponse {
	return MembershipDTOResponse{
		UserID:   m.UserID,
		GroupID:  m.GroupID,
		Role:     m.Role,
		Status:   m.Status,
		JoinedAt: m.JoinedAt,
	}
}

func membershipsDTOsFromDomains(ms []domain.Membership) []MembershipDTOResponse {
	out := make([]MembershipDTOResponse, len(ms))
	for i, m := range ms {
		out[i] = membershipDTOFromDomain(m)
	}
	return out
}
