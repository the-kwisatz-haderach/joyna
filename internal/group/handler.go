package group

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var payload CreateGroupPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Sanitize()
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := h.service.CreateGroup(r.Context(), payload, ownerID)
	if err != nil {
		http.Error(w, "failed to create group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}

func (h *Handler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	groupID := r.PathValue("id")
	if err := uuid.Validate(groupID); err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload UpdateGroupPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Sanitize()
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated, err := h.service.UpdateGroup(r.Context(), payload, groupID, ownerID)
	if err != nil {
		if errors.Is(err, ErrUnauthorizedGroupUpdate) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if errors.Is(err, ErrGroupNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if errors.Is(err, ErrGroupNameTaken) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		http.Error(w, "failed to update group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}
