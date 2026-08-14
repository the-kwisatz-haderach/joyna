package event

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type createEventRequest struct {
	Name                 string     `json:"name"`
	Description          string     `json:"description"`
	Date                 time.Time  `json:"date"`
	Location             string     `json:"location"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty"`
	Type                 EventType  `json:"type"`
	DefaultSpreadAllowed int        `json:"defaultSpreadAllowed"`
}

func (h *Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	eventInput := Event{
		OwnerId:              ownerID,
		Name:                 req.Name,
		Description:          req.Description,
		Date:                 req.Date,
		Location:             req.Location,
		RsvpDeadline:         req.RsvpDeadline,
		Type:                 req.Type,
		DefaultSpreadAllowed: req.DefaultSpreadAllowed,
	}

	created, err := h.service.CreateEvent(r.Context(), eventInput)
	if err != nil {
		if errors.Is(err, ErrPastEventDate) || errors.Is(err, ErrInvalidRsvpDeadline) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}

func (h *Handler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if err := h.service.DeleteEvent(r.Context(), eventID, ownerID); err != nil {
		if errors.Is(err, ErrEventNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		http.Error(w, "failed to delete event", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	eventID := r.PathValue("id")
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req UpdateEventPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	updated, err := h.service.UpdateEvent(r.Context(), req, eventID, ownerID)

	if err != nil {
		if errors.Is(err, ErrUnauthorizedEventUpdate) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if errors.Is(err, ErrEventNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if errors.Is(err, ErrPastEventDate) || errors.Is(err, ErrInvalidRsvpDeadline) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to update event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

func (h *Handler) GetEvents(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	sortField, err := ParseEventSortField(r.URL.Query().Get("sort"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	order, err := ParseSortOrder(r.URL.Query().Get("order"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	events, err := h.service.GetEvents(r.Context(), ownerID, sortField, order)
	if err != nil {
		slog.Error("failed to get events", "error", err)
		http.Error(w, "failed to get events", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func (h *Handler) CreateEventInvite(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var payload CreateEventInvitePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	created, err := h.service.SendEventInvite(r.Context(), payload, ownerID)
	if err != nil {
		if errors.Is(err, ErrInviteNotAllowed) {
			http.Error(w, err.Error(), http.StatusForbidden)
			return
		}
		if errors.Is(err, ErrEventNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		if errors.Is(err, ErrAlreadyInvited) {
			http.Error(w, err.Error(), http.StatusConflict)
			return
		}
		slog.Error("failed to create event invite", "error", err)
		http.Error(w, "couldn't create invite", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}
