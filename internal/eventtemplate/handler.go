package eventtemplate

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

func (h *Handler) GetTemplates(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	templates, err := h.service.ListTemplates(r.Context(), ownerID)
	if err != nil {
		slog.Error("failed to list event templates", "error", err)
		http.Error(w, "failed to list event templates", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(templates)
}

func (h *Handler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var payload CreateEventTemplatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Sanitize()
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	created, err := h.service.CreateTemplate(r.Context(), payload, ownerID)
	if err != nil {
		if errors.Is(err, ErrTemplateOwnerNotFound) || errors.Is(err, ErrInvalidMood) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		slog.Error("failed to create event template", "error", err)
		http.Error(w, "failed to create event template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}

func (h *Handler) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	templateID := r.PathValue("id")
	if err := uuid.Validate(templateID); err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var payload UpdateEventTemplatePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	payload.Sanitize()
	if err := payload.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updated, err := h.service.UpdateTemplate(r.Context(), payload, templateID, ownerID)
	if err != nil {
		if errors.Is(err, ErrTemplateNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if errors.Is(err, ErrInvalidMood) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		slog.Error("failed to update event template", "error", err)
		http.Error(w, "failed to update event template", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (h *Handler) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	templateID := r.PathValue("id")
	if err := uuid.Validate(templateID); err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.service.DeleteTemplate(r.Context(), templateID, ownerID); err != nil {
		if errors.Is(err, ErrTemplateNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		slog.Error("failed to delete event template", "error", err)
		http.Error(w, "failed to delete event template", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
