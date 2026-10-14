package group_transport_http

import (
	"context"
	"net/http"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_http_server "github.com/MulLoMaH/Zunno/internal/core/transport/http/server"
	"github.com/google/uuid"
)

type GroupsHTTPHandler struct {
	groupService GroupService
}

type GroupService interface {
	CreateGroup(ctx context.Context, ownerID uuid.UUID, name string) (domain.Group, error)
	InviteMember(ctx context.Context, requesterID, groupID uuid.UUID, phone string) error
	JoinGroup(ctx context.Context, userID, groupID uuid.UUID) error
	GetUserGroups(ctx context.Context, userID uuid.UUID) ([]domain.Group, error)
	GetGroupMembers(ctx context.Context, requesterID, groupID uuid.UUID) ([]domain.Membership, error)
}

func NewGroupsHTTPHandler(groupService GroupService) *GroupsHTTPHandler {
	return &GroupsHTTPHandler{groupService: groupService}
}

func (h *GroupsHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodPost,
			Path:    "/groups",
			Handler: h.CreateGroup,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups",
			Handler: h.GetGroups,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/invite",
			Handler: h.Invite,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/join",
			Handler: h.Join,
		},
		{
			Method:  http.MethodGet,
			Path:    "/groups/{id}/members",
			Handler: h.GetMembers,
		},
	}
}
