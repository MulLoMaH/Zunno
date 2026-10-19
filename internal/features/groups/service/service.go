package group_service

import (
	"context"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	"github.com/google/uuid"
)

type GroupService struct {
	groups GroupsRepository
	users  UsersRepository
}

type GroupsRepository interface {
	GetUserInvitations(ctx context.Context, userID uuid.UUID) ([]domain.Invitation, error)
	DeclineInvitation(ctx context.Context, userID, groupID uuid.UUID) error
	LeaveGroup(ctx context.Context, userID, groupID uuid.UUID) error
	DeleteGroup(ctx context.Context, groupID, ownerID uuid.UUID) error
	KickMember(ctx context.Context, requesterID, groupID, targetUserID uuid.UUID) error
	ChangeRole(ctx context.Context, groupID, targetUserID uuid.UUID, newRole string) error
	RenameGroup(ctx context.Context, groupID uuid.UUID, newName string, expectedVersion int64) (domain.Group, error)
	CreateGroup(ctx context.Context, group domain.Group) (domain.Group, error)
	GetGroup(ctx context.Context, id uuid.UUID) (domain.Group, error)
	GetUserGroups(ctx context.Context, userID uuid.UUID) ([]domain.Group, error)
	GetMembership(ctx context.Context, userID, groupID uuid.UUID) (domain.Membership, error)
	GetGroupMembers(ctx context.Context, groupID uuid.UUID) ([]domain.GroupMember, error)
	InviteMember(ctx context.Context, userID, groupID uuid.UUID) error
	JoinGroup(ctx context.Context, userID, groupID uuid.UUID) error
}

type UsersRepository interface {
	FindByPhone(ctx context.Context, phone string) (domain.User, error)
}

func NewGroupService(groups GroupsRepository, users UsersRepository) *GroupService {
	return &GroupService{groups: groups, users: users}
}
