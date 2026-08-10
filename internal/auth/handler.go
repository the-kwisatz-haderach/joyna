package auth

import (
	"encoding/json"
	"errors"
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

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.service.Register(r.Context(), req.Name, req.Email, req.Password)
	if err != nil {
		http.Error(w, "could not register user", http.StatusInternalServerError)
		return
	}

	h.sessionManager.Put(r.Context(), sessionUserIDKey, user.Id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
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

	h.sessionManager.Put(r.Context(), sessionUserIDKey, user.Id)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if err := h.sessionManager.Destroy(r.Context()); err != nil {
		http.Error(w, "could not log out", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
