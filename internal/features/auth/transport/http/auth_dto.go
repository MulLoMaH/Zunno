package auth_transport_http

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/MulLoMaH/Zunno/internal/core/domain"
)

type RegisterRequest struct {
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
	FullName    string `json:"full_name"`
	Age         int    `json:"age"`
}

type LoginRequest struct {
	PhoneNumber string `json:"phone_number"`
	Password    string `json:"password"`
}

type UserResponse struct {
	ID          uuid.UUID `json:"id"`
	Version     int64     `json:"version"`
	FullName    string    `json:"full_name"`
	Age         int       `json:"age"`
	PhoneNumber string    `json:"phone_number"`
}

type AuthResponse struct {
	AccessToken string       `json:"access_token"`
	ExpiresIn   int64        `json:"expires_in"`
	User        UserResponse `json:"user"`
}

func userResponseFromDomain(u domain.User) UserResponse {
	return UserResponse{
		ID:          u.ID,
		Version:     u.Version,
		FullName:    u.FullName,
		Age:         u.Age,
		PhoneNumber: u.PhoneNumber,
	}
}

// кука живёт столько, сколько refresh TTL
func (h *AuthHTTPHandler) setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    token,
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   int(h.refreshTTL.Seconds()),
	})
}

func (h *AuthHTTPHandler) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})
}
