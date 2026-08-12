package auth

import (
	"context"
	"net/http"
)

type contextKey int

const (
	userIDContextKey contextKey = iota
)

func (h *Handler) Middleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := h.sessionManager.GetString(r.Context(), sessionUserIDKey)
		if userID == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(NewContextWithUserID(r.Context(), userID)))
	}
}

// NewContextWithUserID returns a copy of ctx carrying the given user ID,
// as retrieved by UserIDFromContext. It is primarily useful for tests
// that need to simulate an authenticated request.
func NewContextWithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, userIDContextKey, userID)
}

func UserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDContextKey).(string)
	return id, ok
}
