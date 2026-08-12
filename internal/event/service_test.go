package event

import (
	"context"
	"errors"
	"testing"
	"time"
)

type mockRepository struct {
	createEventFunc func(ctx context.Context, event Event) (Event, error)
	updateEventFunc func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error)
	deleteEventFunc func(ctx context.Context, eventID, ownerID string) error
}

func (m *mockRepository) CreateEvent(ctx context.Context, event Event) (Event, error) {
	return m.createEventFunc(ctx, event)
}

func (m *mockRepository) UpdateEvent(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
	return m.updateEventFunc(ctx, eventUpdate, eventID, ownerID)
}

func (m *mockRepository) DeleteEvent(ctx context.Context, eventID, ownerID string) error {
	return m.deleteEventFunc(ctx, eventID, ownerID)
}

func TestService_CreateEvent(t *testing.T) {
	futureDate := time.Now().Add(24 * time.Hour)
	pastDate := time.Now().Add(-24 * time.Hour)

	t.Run("rejects events with a past date", func(t *testing.T) {
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				t.Fatal("repository should not be called when the event date is in the past")
				return Event{}, nil
			},
		}
		svc := NewService(repo)

		_, err := svc.CreateEvent(context.Background(), Event{Date: pastDate})

		if !errors.Is(err, ErrPastEventDate) {
			t.Fatalf("expected ErrPastEventDate, got %v", err)
		}
	})

	t.Run("rejects events with a date exactly equal to now", func(t *testing.T) {
		repo := &mockRepository{}
		svc := NewService(repo)

		now := time.Now()
		_, err := svc.CreateEvent(context.Background(), Event{Date: now})

		if !errors.Is(err, ErrPastEventDate) {
			t.Fatalf("expected ErrPastEventDate, got %v", err)
		}
	})

	t.Run("rejects an rsvp deadline after the event date", func(t *testing.T) {
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				t.Fatal("repository should not be called when the rsvp deadline is invalid")
				return Event{}, nil
			},
		}
		svc := NewService(repo)

		rsvpDeadline := futureDate.Add(time.Hour)
		_, err := svc.CreateEvent(context.Background(), Event{
			Date:         futureDate,
			RsvpDeadline: &rsvpDeadline,
		})

		if !errors.Is(err, ErrInvalidRsvpDeadline) {
			t.Fatalf("expected ErrInvalidRsvpDeadline, got %v", err)
		}
	})

	t.Run("allows an rsvp deadline on or before the event date", func(t *testing.T) {
		rsvpDeadline := futureDate
		want := Event{ID: "event-1", Date: futureDate, RsvpDeadline: &rsvpDeadline}
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				return want, nil
			},
		}
		svc := NewService(repo)

		got, err := svc.CreateEvent(context.Background(), Event{Date: futureDate, RsvpDeadline: &rsvpDeadline})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if got != want {
			t.Fatalf("expected %+v, got %+v", want, got)
		}
	})

	t.Run("delegates to the repository and returns its result", func(t *testing.T) {
		input := Event{Name: "Birthday", Date: futureDate}
		want := Event{ID: "event-1", Name: "Birthday", Date: futureDate}
		var gotInput Event
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				gotInput = event
				return want, nil
			},
		}
		svc := NewService(repo)

		got, err := svc.CreateEvent(context.Background(), input)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if gotInput != input {
			t.Fatalf("expected repository to receive %+v, got %+v", input, gotInput)
		}
		if got != want {
			t.Fatalf("expected %+v, got %+v", want, got)
		}
	})

	t.Run("propagates repository errors", func(t *testing.T) {
		repoErr := errors.New("boom")
		repo := &mockRepository{
			createEventFunc: func(ctx context.Context, event Event) (Event, error) {
				return Event{}, repoErr
			},
		}
		svc := NewService(repo)

		_, err := svc.CreateEvent(context.Background(), Event{Date: futureDate})
		if !errors.Is(err, repoErr) {
			t.Fatalf("expected %v, got %v", repoErr, err)
		}
	})
}

func TestService_DeleteEvent(t *testing.T) {
	t.Run("delegates to the repository", func(t *testing.T) {
		var gotEventID, gotOwnerID string
		repo := &mockRepository{
			deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
				gotEventID, gotOwnerID = eventID, ownerID
				return nil
			},
		}
		svc := NewService(repo)

		if err := svc.DeleteEvent(context.Background(), "event-1", "owner-1"); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if gotEventID != "event-1" || gotOwnerID != "owner-1" {
			t.Fatalf("expected repository to receive (event-1, owner-1), got (%s, %s)", gotEventID, gotOwnerID)
		}
	})

	t.Run("propagates repository errors", func(t *testing.T) {
		repo := &mockRepository{
			deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
				return ErrEventNotFound
			},
		}
		svc := NewService(repo)

		err := svc.DeleteEvent(context.Background(), "event-1", "owner-1")
		if !errors.Is(err, ErrEventNotFound) {
			t.Fatalf("expected ErrEventNotFound, got %v", err)
		}
	})
}

func TestService_UpdateEvent(t *testing.T) {
	t.Run("delegates to the repository and returns its result", func(t *testing.T) {
		name := "Updated name"
		update := EventUpdate{Name: &name}
		want := Event{ID: "event-1", Name: name}
		var gotUpdate EventUpdate
		var gotEventID, gotOwnerID string
		repo := &mockRepository{
			updateEventFunc: func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
				gotUpdate = eventUpdate
				gotEventID, gotOwnerID = eventID, ownerID
				return want, nil
			},
		}
		svc := NewService(repo)

		got, err := svc.UpdateEvent(context.Background(), update, "event-1", "owner-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if gotUpdate.Name != update.Name || *gotUpdate.Name != *update.Name {
			t.Fatalf("expected repository to receive update with name %q", name)
		}
		if gotEventID != "event-1" || gotOwnerID != "owner-1" {
			t.Fatalf("expected repository to receive (event-1, owner-1), got (%s, %s)", gotEventID, gotOwnerID)
		}
		if got != want {
			t.Fatalf("expected %+v, got %+v", want, got)
		}
	})

	t.Run("propagates repository errors", func(t *testing.T) {
		repo := &mockRepository{
			updateEventFunc: func(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
				return Event{}, ErrEventNotFound
			},
		}
		svc := NewService(repo)

		_, err := svc.UpdateEvent(context.Background(), EventUpdate{}, "event-1", "owner-1")
		if !errors.Is(err, ErrEventNotFound) {
			t.Fatalf("expected ErrEventNotFound, got %v", err)
		}
	})
}
