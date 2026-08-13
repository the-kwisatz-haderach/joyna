package group

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type createGroupRequest struct {
	Name       string `json:"name"`
	IsFavorite bool   `json:"isFavorite"`
}

func (h *Handler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	ownerID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	var req createGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	groupInput := Group{
		OwnerID:    ownerID,
		Name:       req.Name,
		IsFavorite: req.IsFavorite,
	}

	created, err := h.service.CreateGroup(r.Context(), groupInput)
	if err != nil {
		if errors.Is(err, ErrEmptyGroupName) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		http.Error(w, "failed to create group", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(created)
}
