package auth

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/alexedwards/scs/v2"
)

const sessionUserIDKey = "user_id"

type Handler struct {
	service        *Service
	sessionManager *scs.SessionManager
}

func NewHandler(service *Service, sessionManager *scs.SessionManager) *Handler {
	return &Handler{service: service, sessionManager: sessionManager}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var payload RegisterUserPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Sanitize()
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	user, err := h.service.Register(r.Context(), payload.Name, payload.Email, payload.Password)
	if err != nil {
		if errors.Is(err, ErrUserAlreadyExists) {
			http.Error(w, "user already exists with this email", http.StatusConflict)
			return
		}
		slog.Error("failed to register user", "error", err)
		http.Error(w, "could not register user", http.StatusInternalServerError)
		return
	}

	if err := h.sessionManager.RenewToken(r.Context()); err != nil {
		slog.Error("failed to renew token during register", "error", err)
		http.Error(w, "unauthorized", http.StatusInternalServerError)
		return
	}
	h.sessionManager.Put(r.Context(), sessionUserIDKey, user.Id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		slog.Error("failed to decode login request", "error", err)
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.service.Authenticate(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		http.Error(w, "could not log in", http.StatusInternalServerError)
		return
	}

	if err := h.sessionManager.RenewToken(r.Context()); err != nil {
		slog.Error("failed to renew token during login", "error", err)
		http.Error(w, "unauthorized", http.StatusInternalServerError)
		return
	}
	h.sessionManager.Put(r.Context(), sessionUserIDKey, user.Id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if err := h.sessionManager.Destroy(r.Context()); err != nil {
		slog.Error("logout failed", "error", err)
		http.Error(w, "could not log out", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
