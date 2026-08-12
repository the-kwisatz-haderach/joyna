package event

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

func authenticatedRequest(t *testing.T, method, target string, body []byte, ownerID string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(method, target, bytes.NewReader(body))
	if ownerID != "" {
		req = req.WithContext(auth.NewContextWithUserID(context.Background(), ownerID))
	}
	return req
}

func TestHandler_CreateEvent(t *testing.T) {
	futureDate := time.Now().Add(24 * time.Hour)

	t.Run("returns 401 when unauthenticated", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		req := httptest.NewRequest(http.MethodPost, "/events", nil)
		w := httptest.NewRecorder()

		h.CreateEvent(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 400 for an invalid request body", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		req := authenticatedRequest(t, http.MethodPost, "/events", []byte("not-json"), "owner-1")
		w := httptest.NewRecorder()

		h.CreateEvent(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 400 when the event date is in the past", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		body, _ := json.Marshal(createEventRequest{Name: "Party", Date: time.Now().Add(-time.Hour)})
		req := authenticatedRequest(t, http.MethodPost, "/events", body, "owner-1")
		w := httptest.NewRecorder()

		h.CreateEvent(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 500 when the repository fails unexpectedly", func(t *testing.T) {
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				return Event{}, errors.New("boom")
			},
		}
		h := NewHandler(NewService(repo))
		body, _ := json.Marshal(createEventRequest{Name: "Party", Date: futureDate})
		req := authenticatedRequest(t, http.MethodPost, "/events", body, "owner-1")
		w := httptest.NewRecorder()

		h.CreateEvent(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})

	t.Run("returns 201 with the created event", func(t *testing.T) {
		created := Event{ID: "event-1", OwnerId: "owner-1", Name: "Party", Date: futureDate}
		var gotOwnerID string
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				gotOwnerID = event.OwnerId
				return created, nil
			},
		}
		h := NewHandler(NewService(repo))
		body, _ := json.Marshal(createEventRequest{Name: "Party", Date: futureDate})
		req := authenticatedRequest(t, http.MethodPost, "/events", body, "owner-1")
		w := httptest.NewRecorder()

		h.CreateEvent(w, req)

		if w.Code != http.StatusCreated {
			t.Fatalf("expected status %d, got %d", http.StatusCreated, w.Code)
		}
		if gotOwnerID != "owner-1" {
			t.Fatalf("expected owner id to be taken from the auth context, got %q", gotOwnerID)
		}

		var got Event
		if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
			t.Fatalf("failed to decode response body: %v", err)
		}
		if got.ID != created.ID {
			t.Fatalf("expected event id %q, got %q", created.ID, got.ID)
		}
	})
}

func TestHandler_DeleteEvent(t *testing.T) {
	t.Run("returns 401 when unauthenticated", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		req := httptest.NewRequest(http.MethodDelete, "/events/event-1", nil)
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.DeleteEvent(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 404 when the event does not exist", func(t *testing.T) {
		repo := &mockRepository{
			deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
				return ErrEventNotFound
			},
		}
		h := NewHandler(NewService(repo))
		req := authenticatedRequest(t, http.MethodDelete, "/events/event-1", nil, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.DeleteEvent(w, req)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})

	t.Run("returns 500 when the repository fails unexpectedly", func(t *testing.T) {
		repo := &mockRepository{
			deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
				return errors.New("boom")
			},
		}
		h := NewHandler(NewService(repo))
		req := authenticatedRequest(t, http.MethodDelete, "/events/event-1", nil, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.DeleteEvent(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})

	t.Run("returns 204 on success", func(t *testing.T) {
		var gotEventID, gotOwnerID string
		repo := &mockRepository{
			deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
				gotEventID, gotOwnerID = eventID, ownerID
				return nil
			},
		}
		h := NewHandler(NewService(repo))
		req := authenticatedRequest(t, http.MethodDelete, "/events/event-1", nil, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.DeleteEvent(w, req)

		if w.Code != http.StatusNoContent {
			t.Fatalf("expected status %d, got %d", http.StatusNoContent, w.Code)
		}
		if gotEventID != "event-1" || gotOwnerID != "owner-1" {
			t.Fatalf("expected (event-1, owner-1), got (%s, %s)", gotEventID, gotOwnerID)
		}
	})
}

func TestHandler_UpdateEvent(t *testing.T) {
	t.Run("returns 401 when unauthenticated", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		req := httptest.NewRequest(http.MethodPatch, "/events/event-1", nil)
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.UpdateEvent(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
		}
	})

	t.Run("returns 400 for an invalid request body", func(t *testing.T) {
		h := NewHandler(NewService(&mockRepository{}))
		req := authenticatedRequest(t, http.MethodPatch, "/events/event-1", []byte("not-json"), "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.UpdateEvent(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
		}
	})

	t.Run("returns 404 when the event does not exist", func(t *testing.T) {
		repo := &mockRepository{
			updateEventFunc: func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
				return Event{}, ErrEventNotFound
			},
		}
		h := NewHandler(NewService(repo))
		body, _ := json.Marshal(EventUpdate{})
		req := authenticatedRequest(t, http.MethodPatch, "/events/event-1", body, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.UpdateEvent(w, req)

		if w.Code != http.StatusNotFound {
			t.Fatalf("expected status %d, got %d", http.StatusNotFound, w.Code)
		}
	})

	t.Run("returns 500 when the repository fails unexpectedly", func(t *testing.T) {
		repo := &mockRepository{
			updateEventFunc: func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
				return Event{}, errors.New("boom")
			},
		}
		h := NewHandler(NewService(repo))
		body, _ := json.Marshal(EventUpdate{})
		req := authenticatedRequest(t, http.MethodPatch, "/events/event-1", body, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.UpdateEvent(w, req)

		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
		}
	})

	t.Run("returns 200 with the updated event", func(t *testing.T) {
		name := "New name"
		updated := Event{ID: "event-1", OwnerId: "owner-1", Name: name}
		var gotEventID, gotOwnerID string
		repo := &mockRepository{
			updateEventFunc: func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
				gotEventID, gotOwnerID = eventID, ownerID
				return updated, nil
			},
		}
		h := NewHandler(NewService(repo))
		body, _ := json.Marshal(EventUpdate{Name: &name})
		req := authenticatedRequest(t, http.MethodPatch, "/events/event-1", body, "owner-1")
		req.SetPathValue("id", "event-1")
		w := httptest.NewRecorder()

		h.UpdateEvent(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, w.Code)
		}
		if gotEventID != "event-1" || gotOwnerID != "owner-1" {
			t.Fatalf("expected (event-1, owner-1), got (%s, %s)", gotEventID, gotOwnerID)
		}

		var got Event
		if err := json.NewDecoder(w.Body).Decode(&got); err != nil {
			t.Fatalf("failed to decode response body: %v", err)
		}
		if got.Name != name {
			t.Fatalf("expected name %q, got %q", name, got.Name)
		}
	})
}
