package notification

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type notificationListResponse struct {
	Notifications []Notification `json:"notifications"`
	Page          int            `json:"page"`
	PageSize      int            `json:"pageSize"`
	TotalCount    int            `json:"totalCount"`
	TotalPages    int            `json:"totalPages"`
}

// ListNotifications returns a page of the caller's notifications and marks
// any currently-unread ones as read as a side effect. Pages are 1-indexed
// and requested via the ?page= query param, defaulting to 1.
func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	page := 1
	if raw := r.URL.Query().Get("page"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed < 1 {
			http.Error(w, "page must be a positive integer", http.StatusBadRequest)
			return
		}
		page = parsed
	}

	notifications, total, err := h.service.ListForUser(r.Context(), userID, page)
	if err != nil {
		slog.Error("failed to list notifications", "error", err)
		http.Error(w, "failed to list notifications", http.StatusInternalServerError)
		return
	}

	totalPages := (total + PageSize - 1) / PageSize
	if totalPages < 1 {
		totalPages = 1
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notificationListResponse{
		Notifications: notifications,
		Page:          page,
		PageSize:      PageSize,
		TotalCount:    total,
		TotalPages:    totalPages,
	})
}

type unreadCountResponse struct {
	Count int `json:"count"`
}

func (h *Handler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	count, err := h.service.UnreadCount(r.Context(), userID)
	if err != nil {
		slog.Error("failed to count unread notifications", "error", err)
		http.Error(w, "failed to count unread notifications", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(unreadCountResponse{Count: count})
}

// SubscribeToPush registers the caller's browser for push notifications.
func (h *Handler) SubscribeToPush(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload SubscribeToPushPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	sub, err := h.service.SubscribeToPush(r.Context(), userID, payload)
	if err != nil {
		if errors.Is(err, ErrInvalidPushSubscription) {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		slog.Error("failed to subscribe to push", "error", err)
		http.Error(w, "failed to subscribe to push", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sub)
}

// UnsubscribeFromPush removes the caller's push subscription for the given
// endpoint.
func (h *Handler) UnsubscribeFromPush(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var payload UnsubscribeFromPushPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.service.UnsubscribeFromPush(r.Context(), userID, payload); err != nil {
		if errors.Is(err, ErrPushSubscriptionNotFound) {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		slog.Error("failed to unsubscribe from push", "error", err)
		http.Error(w, "failed to unsubscribe from push", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

type vapidPublicKeyResponse struct {
	PublicKey string `json:"publicKey"`
}

// GetVAPIDPublicKey returns the server's VAPID public key, fetched once by
// the frontend to build the applicationServerKey it passes to
// pushManager.subscribe().
func (h *Handler) GetVAPIDPublicKey(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vapidPublicKeyResponse{PublicKey: h.service.VAPIDPublicKey()})
}
