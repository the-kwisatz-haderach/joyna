package network

import (
	"encoding/json"
	"errors"
	"log/slog"
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

func (h *Handler) GetConnections(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	connections, err := h.service.ListConnections(r.Context(), ownerID)
	if err != nil {
		slog.Error("failed to list connections", "error", err)
		http.Error(w, "failed to list connections", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(connections)
}

func (h *Handler) GetPotentialConnections(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	potential, err := h.service.ListPotentialConnections(r.Context(), ownerID)
	if err != nil {
		slog.Error("failed to list potential connections", "error", err)
		http.Error(w, "failed to list potential connections", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(potential)
}

func (h *Handler) CreateConnection(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload CreateConnectionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := h.service.CreateConnection(r.Context(), payload, ownerID)
	if err != nil {
		switch {
		case errors.Is(err, ErrSelfConnection):
			http.Error(w, err.Error(), http.StatusBadRequest)
		case errors.Is(err, ErrContactNotFound), errors.Is(err, ErrGroupNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, ErrConnectionAlreadyExists):
			http.Error(w, err.Error(), http.StatusConflict)
		default:
			slog.Error("failed to create connection", "error", err)
			http.Error(w, "failed to create connection", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}

func (h *Handler) UpdateConnection(w http.ResponseWriter, r *http.Request) {
	contactID := r.PathValue("contactId")
	if err := uuid.Validate(contactID); err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload UpdateConnectionPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated, err := h.service.UpdateConnection(r.Context(), payload, contactID, ownerID)
	if err != nil {
		switch {
		case errors.Is(err, ErrConnectionNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		case errors.Is(err, ErrGroupNotFound):
			http.Error(w, err.Error(), http.StatusNotFound)
		default:
			slog.Error("failed to update connection", "error", err)
			http.Error(w, "failed to update connection", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}
