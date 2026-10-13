package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
	core_errors "github.com/MulLoMaH/Zunno/internal/core/errors"
)

type Manager struct {
	secret     []byte
	issuer     string
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewManager(secret, issuer string, accessTTL, refreshTTL time.Duration) *Manager {
	return &Manager{
		secret:     []byte(secret),
		issuer:     issuer,
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (m *Manager) AccessTTL() time.Duration  { return m.accessTTL }
func (m *Manager) RefreshTTL() time.Duration { return m.refreshTTL }

// Issue возвращает access, refresh и jti (ID refresh-токена для Redis).
func (m *Manager) Issue(user domain.User) (access, refresh, jti string, err error) {
	now := time.Now()

	accessClaims := domain.Claims{
		UserID: user.ID.String(),
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   user.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.accessTTL)),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	access, err = accessToken.SignedString(m.secret)
	if err != nil {
		return "", "", "", err
	}

	jti = uuid.NewString()
	refreshClaims := domain.RefreshClaims{
		JTI: jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   user.ID.String(),
			ID:        jti,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.refreshTTL)),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refresh, err = refreshToken.SignedString(m.secret)
	return access, refresh, jti, err
}

func (m *Manager) ParseAccess(raw string) (domain.Claims, error) {
	claims := domain.Claims{}
	token, err := jwt.ParseWithClaims(raw, &claims, m.keyfunc,
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(m.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return domain.Claims{}, core_errors.ErrInvalidToken
	}
	return claims, nil
}

func (m *Manager) ParseRefresh(raw string) (domain.RefreshClaims, error) {
	claims := domain.RefreshClaims{}
	token, err := jwt.ParseWithClaims(raw, &claims, m.keyfunc,
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(m.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return domain.RefreshClaims{}, core_errors.ErrInvalidToken
	}
	claims.JTI = claims.ID
	return claims, nil
}

func (m *Manager) keyfunc(t *jwt.Token) (any, error) {
	if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, errors.New("unexpected signing method")
	}
	return m.secret, nil
}
