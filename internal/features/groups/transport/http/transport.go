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
	GetUserInvitations(ctx context.Context, userID uuid.UUID) ([]domain.Invitation, error)
	DeclineInvitation(ctx context.Context, userID, groupID uuid.UUID) error
	LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error
	DeleteGroup(ctx context.Context, requesterID, groupID uuid.UUID) error
	KickMember(ctx context.Context, requesterID, groupID, targetUserID uuid.UUID) error
	ChangeRole(ctx context.Context, requesterID, groupID, targetUserID uuid.UUID, newRole string) error
	RenameGroup(ctx context.Context, requesterID, groupID uuid.UUID, newName string, expectedVersion int64) (domain.Group, error)
	CreateGroup(ctx context.Context, ownerID uuid.UUID, name string) (domain.Group, error)
	InviteMember(ctx context.Context, requesterID, groupID uuid.UUID, phone string) error
	JoinGroup(ctx context.Context, userID, groupID uuid.UUID) error
	GetUserGroups(ctx context.Context, userID uuid.UUID) ([]domain.Group, error)
	GetGroupMembers(ctx context.Context, requesterID, groupID uuid.UUID) ([]domain.GroupMember, error)
}

func NewGroupsHTTPHandler(groupService GroupService) *GroupsHTTPHandler {
	return &GroupsHTTPHandler{groupService: groupService}
}

func (h *GroupsHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodGet,
			Path:    "/invitations",
			Handler: h.GetInvitations,
		},
		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/decline",
			Handler: h.DeclineInvitation,
		},

		{
			Method:  http.MethodPost,
			Path:    "/groups/{id}/leave",
			Handler: h.LeaveGroup,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}",
			Handler: h.DeleteGroup,
		},
		{
			Method:  http.MethodDelete,
			Path:    "/groups/{id}/members/{userId}",
			Handler: h.KickMember,
		},
		{
			Method:  http.MethodPatch,
			Path:    "/groups/{id}/members/{userId}",
			Handler: h.ChangeRole,
		},

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
			Method:  http.MethodPatch,
			Path:    "/groups/{id}",
			Handler: h.RenameGroup,
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
