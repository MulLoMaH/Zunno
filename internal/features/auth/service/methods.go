package auth_service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
	core_pwd "github.com/MulLoMaH/Zunno/internal/core/pwd"
)

type RegisterInput struct {
	PhoneNumber string
	Password    string
	FullName    string
	Age         int
}

type LoginInput struct {
	PhoneNumber string
	Password    string
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

type AuthResult struct {
	User   domain.User
	Tokens TokenPair
}

func (s *AuthService) Register(ctx context.Context, in RegisterInput) (AuthResult, error) {
	user, err := s.users.CreateUser(ctx, domain.User{
		PhoneNumber:  in.PhoneNumber,
		PasswordHash: in.Password, // plaintext, CreateUser сам захран
		FullName:     in.FullName,
		Age:          in.Age,
	})
	if err != nil {
		return AuthResult{}, fmt.Errorf("register: %w", err)
	}

	tokens, err := s.issueAndStore(ctx, user)
	if err != nil {
		return AuthResult{}, fmt.Errorf("register: %w", err)
	}

	return AuthResult{User: user, Tokens: tokens}, nil
}

func (s *AuthService) Login(ctx context.Context, in LoginInput) (AuthResult, error) {
	user, err := s.users.FindByPhone(ctx, in.PhoneNumber)
	if err != nil {
		return AuthResult{}, core_errors.ErrInvalidCredentials
	}

	if err := core_pwd.VerifyPassword(user.PasswordHash, in.Password); err != nil {
		return AuthResult{}, core_errors.ErrInvalidCredentials
	}

	tokens, err := s.issueAndStore(ctx, user)
	if err != nil {
		return AuthResult{}, fmt.Errorf("login: %w", err)
	}

	return AuthResult{User: user, Tokens: tokens}, nil
}

func (s *AuthService) Refresh(ctx context.Context, rawRefresh string) (AuthResult, error) {
	claims, err := s.tokens.ParseRefresh(rawRefresh)
	if err != nil {
		return AuthResult{}, core_errors.ErrInvalidToken
	}

	userID, err := s.refresh.GetUserID(ctx, claims.JTI)
	if err != nil {
		_ = s.refresh.DeleteAllForUser(ctx, claims.Subject)
		return AuthResult{}, core_errors.ErrInvalidToken
	}

	if err := s.refresh.Delete(ctx, claims.JTI); err != nil {
		return AuthResult{}, fmt.Errorf("refresh: %w", err)
	}

	user, err := s.users.GetUser(ctx, uuid.MustParse(userID))
	if err != nil {
		return AuthResult{}, fmt.Errorf("refresh: %w", err)
	}

	tokens, err := s.issueAndStore(ctx, user)
	if err != nil {
		return AuthResult{}, fmt.Errorf("refresh: %w", err)
	}

	return AuthResult{User: user, Tokens: tokens}, nil
}

func (s *AuthService) Logout(ctx context.Context, rawRefresh string) error {
	claims, err := s.tokens.ParseRefresh(rawRefresh)
	if err != nil {
		return nil
	}
	return s.refresh.Delete(ctx, claims.JTI)
}

func (s *AuthService) issueAndStore(ctx context.Context, user domain.User) (TokenPair, error) {
	access, refresh, jti, err := s.tokens.Issue(user)
	if err != nil {
		return TokenPair{}, fmt.Errorf("issue: %w", err)
	}

	if err := s.refresh.Save(ctx, jti, user.ID.String(), s.tokens.RefreshTTL()); err != nil {
		return TokenPair{}, fmt.Errorf("save refresh: %w", err)
	}

	return TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(s.tokens.AccessTTL().Seconds()),
	}, nil
}
