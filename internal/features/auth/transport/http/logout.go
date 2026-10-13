package auth_transport_http

import (
	"net/http"
)

func (h *AuthHTTPHandler) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if cookie, err := r.Cookie("refresh_token"); err == nil {
		_ = h.authService.Logout(ctx, cookie.Value)
	}

	h.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}
