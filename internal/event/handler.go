package event

import (
	"encoding/json"
	"errors"
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
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(created)
}
