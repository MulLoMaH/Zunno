package domain

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	UserID string `json:"sub"`
	jwt.RegisteredClaims
}

type RefreshClaims struct {
	JTI string `json:"-"`
	jwt.RegisteredClaims
}
