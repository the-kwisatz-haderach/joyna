package event

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	createEventFunc          func(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error)
	updateEventFunc          func(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error)
	deleteEventFunc          func(ctx context.Context, eventID, ownerID string) error
	getEventsByOwnerFunc     func(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error)
	getEventFunc             func(ctx context.Context, eventID string) (Event, error)
	getEventInviteFunc       func(ctx context.Context, eventID, userID string) (EventInvite, error)
	respondToEventInviteFunc func(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error)
	listEventAttendeesFunc   func(ctx context.Context, eventID string) ([]Attendee, error)
	createEventInviteFunc    func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	forwardEventInviteFunc   func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error)
	deleteEventInviteFunc    func(ctx context.Context, eventID, userID string) error
}

func (f *fakeRepository) CreateEvent(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error) {
	return f.createEventFunc(ctx, payload, ownerID)
}

func (f *fakeRepository) UpdateEvent(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
	return f.updateEventFunc(ctx, eventUpdate, eventID, ownerID)
}

func (f *fakeRepository) DeleteEvent(ctx context.Context, eventID, ownerID string) error {
	return f.deleteEventFunc(ctx, eventID, ownerID)
}

func (f *fakeRepository) GetEventsByOwner(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error) {
	return f.getEventsByOwnerFunc(ctx, userID, sortField, order, scope)
}

func (f *fakeRepository) GetEvent(ctx context.Context, eventID string) (Event, error) {
	return f.getEventFunc(ctx, eventID)
}

func (f *fakeRepository) GetEventInvite(ctx context.Context, eventID, userID string) (EventInvite, error) {
	return f.getEventInviteFunc(ctx, eventID, userID)
}

func (f *fakeRepository) RespondToEventInvite(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
	return f.respondToEventInviteFunc(ctx, eventID, userID, status)
}

func (f *fakeRepository) ListEventAttendees(ctx context.Context, eventID string) ([]Attendee, error) {
	return f.listEventAttendeesFunc(ctx, eventID)
}

func (f *fakeRepository) CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	return f.createEventInviteFunc(ctx, payload, invitedBy)
}

func (f *fakeRepository) ForwardEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	return f.forwardEventInviteFunc(ctx, payload, invitedBy)
}

func (f *fakeRepository) DeleteEventInvite(ctx context.Context, eventID, userID string) error {
	return f.deleteEventInviteFunc(ctx, eventID, userID)
}

type notifyCall struct {
	userID           string
	notificationType string
	payload          map[string]any
}

type fakeNotifier struct {
	calls []notifyCall
}

func (f *fakeNotifier) Notify(ctx context.Context, userID, notificationType string, payload map[string]any) error {
	f.calls = append(f.calls, notifyCall{userID: userID, notificationType: notificationType, payload: payload})
	return nil
}

func TestCreateEvent(t *testing.T) {
	createdEvent := Event{ID: "event-id"}
	repo := &fakeRepository{
		createEventFunc: func(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error) {
			require.Equal(t, "owner-id", ownerID)
			return createdEvent, nil
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventPayload{Date: time.Now().Add(24 * time.Hour)}
	event, err := service.CreateEvent(context.Background(), payload, "owner-id")
	require.NoError(t, err)
	require.Equal(t, createdEvent, event)
}

func TestCreateEvent_PastDate(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo, nil)
	payload := CreateEventPayload{Date: time.Now().Add(-24 * time.Hour)}
	_, err := service.CreateEvent(context.Background(), payload, "owner-id")
	require.ErrorIs(t, err, ErrPastEventDate)
}

func TestCreateEvent_InvalidRsvpDeadline(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo, nil)
	date := time.Now().Add(24 * time.Hour)
	rsvpDeadline := date.Add(time.Hour)
	payload := CreateEventPayload{Date: date, RsvpDeadline: &rsvpDeadline}
	_, err := service.CreateEvent(context.Background(), payload, "owner-id")
	require.ErrorIs(t, err, ErrInvalidRsvpDeadline)
}

func TestDeleteEvent(t *testing.T) {
	var called bool
	repo := &fakeRepository{
		deleteEventFunc: func(ctx context.Context, eventID, ownerID string) error {
			called = true
			require.Equal(t, "event-id", eventID)
			require.Equal(t, "owner-id", ownerID)
			return nil
		},
	}
	service := NewService(repo, nil)
	err := service.DeleteEvent(context.Background(), "event-id", "owner-id")
	require.NoError(t, err)
	require.True(t, called)
}

func TestUpdateEvent(t *testing.T) {
	existing := Event{ID: "event-id", OwnerId: "owner-id", Date: time.Now().Add(48 * time.Hour)}
	updated := Event{ID: "event-id", OwnerId: "owner-id", Name: "renamed"}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
		updateEventFunc: func(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
			return updated, nil
		},
	}
	service := NewService(repo, nil)
	name := "renamed"
	event, err := service.UpdateEvent(context.Background(), UpdateEventPayload{Name: &name}, "event-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, updated, event)
}

func TestUpdateEvent_EventNotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{}, ErrEventNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.UpdateEvent(context.Background(), UpdateEventPayload{}, "event-id", "owner-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestUpdateEvent_UnauthorizedOwner(t *testing.T) {
	existing := Event{ID: "event-id", OwnerId: "someone-else", Date: time.Now().Add(48 * time.Hour)}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
	}
	service := NewService(repo, nil)
	_, err := service.UpdateEvent(context.Background(), UpdateEventPayload{}, "event-id", "owner-id")
	require.ErrorIs(t, err, ErrUnauthorizedEventUpdate)
}

func TestUpdateEvent_PastDate(t *testing.T) {
	existing := Event{ID: "event-id", OwnerId: "owner-id", Date: time.Now().Add(48 * time.Hour)}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
	}
	service := NewService(repo, nil)
	pastDate := time.Now().Add(-time.Hour)
	_, err := service.UpdateEvent(context.Background(), UpdateEventPayload{Date: &pastDate}, "event-id", "owner-id")
	require.ErrorIs(t, err, ErrPastEventDate)
}

func TestUpdateEvent_InvalidRsvpDeadline(t *testing.T) {
	date := time.Now().Add(48 * time.Hour)
	existing := Event{ID: "event-id", OwnerId: "owner-id", Date: date}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
	}
	service := NewService(repo, nil)
	rsvpDeadline := date.Add(time.Hour)
	_, err := service.UpdateEvent(context.Background(), UpdateEventPayload{RsvpDeadline: &rsvpDeadline}, "event-id", "owner-id")
	require.ErrorIs(t, err, ErrInvalidRsvpDeadline)
}

func TestGetEvents(t *testing.T) {
	events := []EventView{{Event: Event{ID: "event-id"}}}
	repo := &fakeRepository{
		getEventsByOwnerFunc: func(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error) {
			require.Equal(t, "owner-id", userID)
			require.Equal(t, EventSortFieldDate, sortField)
			require.Equal(t, SortOrderDesc, order)
			require.Equal(t, EventListScopeOwned, scope)
			return events, nil
		},
	}
	service := NewService(repo, nil)
	result, err := service.GetEvents(context.Background(), "owner-id", EventSortFieldDate, SortOrderDesc, EventListScopeOwned)
	require.NoError(t, err)
	require.Equal(t, events, result)
}

func TestSendEventInvite_NotAllowedSelfInvite(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{InvitedUserID: "user-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "user-id")
	require.ErrorIs(t, err, ErrInviteNotAllowed)
}

func TestSendEventInvite_EventNotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{}, ErrEventNotFound
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "owner-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestSendEventInvite_ByOwner(t *testing.T) {
	createdInvite := EventInvite{EventID: "event-id"}
	var createCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		createEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			createCalled = true
			require.Equal(t, "owner-id", invitedBy)
			return createdInvite, nil
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	invite, err := service.SendEventInvite(context.Background(), payload, "owner-id")
	require.NoError(t, err)
	require.True(t, createCalled)
	require.Equal(t, createdInvite, invite)
}

func TestSendEventInvite_Forwarded(t *testing.T) {
	forwardedInvite := EventInvite{EventID: "event-id"}
	var forwardCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		forwardEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			forwardCalled = true
			require.Equal(t, "forwarding-user-id", invitedBy)
			require.Equal(t, 0, payload.SpreadAllowed)
			return forwardedInvite, nil
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id", SpreadAllowed: 3}
	invite, err := service.SendEventInvite(context.Background(), payload, "forwarding-user-id")
	require.NoError(t, err)
	require.True(t, forwardCalled)
	require.Equal(t, forwardedInvite, invite)
}

func TestSendEventInvite_ByOwner_AfterRsvpClosed(t *testing.T) {
	deadline := time.Now().Add(-time.Hour)
	createdInvite := EventInvite{EventID: "event-id"}
	var createCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id", RsvpDeadline: &deadline}, nil
		},
		createEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			createCalled = true
			return createdInvite, nil
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	invite, err := service.SendEventInvite(context.Background(), payload, "owner-id")
	require.NoError(t, err)
	require.True(t, createCalled)
	require.Equal(t, createdInvite, invite)
}

func TestSendEventInvite_Forwarded_RsvpClosed(t *testing.T) {
	deadline := time.Now().Add(-time.Hour)
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id", RsvpDeadline: &deadline}, nil
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "forwarding-user-id")
	require.ErrorIs(t, err, ErrRsvpClosed)
}

func TestSendEventInvite_ForwardError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		forwardEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			return EventInvite{}, repoErr
		},
	}
	service := NewService(repo, nil)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "forwarding-user-id")
	require.ErrorIs(t, err, repoErr)
}

func TestGetEventDetail_Owner(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
	}
	service := NewService(repo, nil)
	detail, err := service.GetEventDetail(context.Background(), "event-id", "owner-id")
	require.NoError(t, err)
	require.True(t, detail.IsOwner)
	require.Nil(t, detail.ViewerInviteStatus)
}

func TestGetEventDetail_Invitee(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		getEventInviteFunc: func(ctx context.Context, eventID, userID string) (EventInvite, error) {
			require.Equal(t, "invitee-id", userID)
			return EventInvite{EventID: eventID, InvitedUserID: userID, Status: InviteStatePending, SpreadAllowed: 2}, nil
		},
	}
	service := NewService(repo, nil)
	detail, err := service.GetEventDetail(context.Background(), "event-id", "invitee-id")
	require.NoError(t, err)
	require.False(t, detail.IsOwner)
	require.NotNil(t, detail.ViewerInviteStatus)
	require.Equal(t, InviteStatePending, *detail.ViewerInviteStatus)
	require.NotNil(t, detail.ViewerSpreadAllowed)
	require.Equal(t, 2, *detail.ViewerSpreadAllowed)
}

func TestGetEventDetail_NotInvited(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		getEventInviteFunc: func(ctx context.Context, eventID, userID string) (EventInvite, error) {
			return EventInvite{}, ErrInviteNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.GetEventDetail(context.Background(), "event-id", "stranger-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestGetEventDetail_EventNotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{}, ErrEventNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.GetEventDetail(context.Background(), "event-id", "owner-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestGetEventAttendees(t *testing.T) {
	attendees := []Attendee{{UserID: "owner-id", IsOwner: true}}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		listEventAttendeesFunc: func(ctx context.Context, eventID string) ([]Attendee, error) {
			require.Equal(t, "event-id", eventID)
			return attendees, nil
		},
	}
	service := NewService(repo, nil)
	result, err := service.GetEventAttendees(context.Background(), "event-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, attendees, result)
}

func TestGetEventAttendees_NotInvited(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		getEventInviteFunc: func(ctx context.Context, eventID, userID string) (EventInvite, error) {
			return EventInvite{}, ErrInviteNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.GetEventAttendees(context.Background(), "event-id", "stranger-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestRespondToEventInvite(t *testing.T) {
	updated := EventInvite{EventID: "event-id", InvitedUserID: "user-id", Status: InviteStateAccepted}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		respondToEventInviteFunc: func(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
			require.Equal(t, "event-id", eventID)
			require.Equal(t, "user-id", userID)
			require.Equal(t, InviteStateAccepted, status)
			return updated, nil
		},
	}
	service := NewService(repo, nil)
	invite, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStateAccepted)
	require.NoError(t, err)
	require.Equal(t, updated, invite)
}

func TestRespondToEventInvite_InvalidStatus(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo, nil)
	_, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStatePending)
	require.ErrorIs(t, err, ErrInvalidInviteStatus)
}

func TestRespondToEventInvite_NotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		respondToEventInviteFunc: func(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
			return EventInvite{}, ErrInviteNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStateDeclined)
	require.ErrorIs(t, err, ErrInviteNotFound)
}

func TestRespondToEventInvite_EventNotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{}, ErrEventNotFound
		},
	}
	service := NewService(repo, nil)
	_, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStateAccepted)
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestRespondToEventInvite_RsvpClosed(t *testing.T) {
	deadline := time.Now().Add(-time.Hour)
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id", RsvpDeadline: &deadline}, nil
		},
	}
	service := NewService(repo, nil)
	_, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStateAccepted)
	require.ErrorIs(t, err, ErrRsvpClosed)
}

func TestRemoveEventInvite_ByOwner(t *testing.T) {
	var deleteCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		deleteEventInviteFunc: func(ctx context.Context, eventID, userID string) error {
			deleteCalled = true
			require.Equal(t, "event-id", eventID)
			require.Equal(t, "guest-id", userID)
			return nil
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "owner-id", "guest-id")
	require.NoError(t, err)
	require.True(t, deleteCalled)
}

func TestRemoveEventInvite_ByOriginalInviter(t *testing.T) {
	var deleteCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		getEventInviteFunc: func(ctx context.Context, eventID, userID string) (EventInvite, error) {
			return EventInvite{EventID: eventID, InvitedUserID: userID, InvitedBy: "inviter-id"}, nil
		},
		deleteEventInviteFunc: func(ctx context.Context, eventID, userID string) error {
			deleteCalled = true
			return nil
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "inviter-id", "guest-id")
	require.NoError(t, err)
	require.True(t, deleteCalled)
}

func TestRemoveEventInvite_NotAllowed(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		getEventInviteFunc: func(ctx context.Context, eventID, userID string) (EventInvite, error) {
			return EventInvite{EventID: eventID, InvitedUserID: userID, InvitedBy: "someone-else"}, nil
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "not-the-inviter", "guest-id")
	require.ErrorIs(t, err, ErrRemoveNotAllowed)
}

func TestRemoveEventInvite_ByOwner_AfterRsvpClosed(t *testing.T) {
	deadline := time.Now().Add(-time.Hour)
	var deleteCalled bool
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id", RsvpDeadline: &deadline}, nil
		},
		deleteEventInviteFunc: func(ctx context.Context, eventID, userID string) error {
			deleteCalled = true
			return nil
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "owner-id", "guest-id")
	require.NoError(t, err)
	require.True(t, deleteCalled)
}

func TestRemoveEventInvite_ByOriginalInviter_RsvpClosed(t *testing.T) {
	deadline := time.Now().Add(-time.Hour)
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id", RsvpDeadline: &deadline}, nil
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "inviter-id", "guest-id")
	require.ErrorIs(t, err, ErrRsvpClosed)
}

func TestRemoveEventInvite_EventNotFound(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{}, ErrEventNotFound
		},
	}
	service := NewService(repo, nil)
	err := service.RemoveEventInvite(context.Background(), "event-id", "owner-id", "guest-id")
	require.ErrorIs(t, err, ErrEventNotFound)
}

func TestSendEventInvite_ByOwner_NotifiesInvitee(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		createEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			return EventInvite{EventID: "event-id"}, nil
		},
	}
	notifier := &fakeNotifier{}
	service := NewService(repo, notifier)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "owner-id")
	require.NoError(t, err)
	require.Equal(t, []notifyCall{{
		userID:           "invited-id",
		notificationType: notificationEventInvite,
		payload:          map[string]any{"eventId": "event-id", "actorId": "owner-id"},
	}}, notifier.calls)
}

func TestSendEventInvite_Forwarded_NotifiesInvitee(t *testing.T) {
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		forwardEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			return EventInvite{EventID: "event-id"}, nil
		},
	}
	notifier := &fakeNotifier{}
	service := NewService(repo, notifier)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "forwarding-user-id")
	require.NoError(t, err)
	require.Equal(t, []notifyCall{{
		userID:           "invited-id",
		notificationType: notificationEventInvite,
		payload:          map[string]any{"eventId": "event-id", "actorId": "forwarding-user-id"},
	}}, notifier.calls)
}

func TestSendEventInvite_RepositoryError_DoesNotNotify(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		createEventInviteFunc: func(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
			return EventInvite{}, repoErr
		},
	}
	notifier := &fakeNotifier{}
	service := NewService(repo, notifier)
	payload := CreateEventInvitePayload{EventID: "event-id", InvitedUserID: "invited-id"}
	_, err := service.SendEventInvite(context.Background(), payload, "owner-id")
	require.ErrorIs(t, err, repoErr)
	require.Empty(t, notifier.calls)
}

func TestRespondToEventInvite_NotifiesOriginalInviter(t *testing.T) {
	updated := EventInvite{EventID: "event-id", InvitedUserID: "user-id", InvitedBy: "inviter-id", Status: InviteStateDeclined}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return Event{ID: "event-id", OwnerId: "owner-id"}, nil
		},
		respondToEventInviteFunc: func(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
			return updated, nil
		},
	}
	notifier := &fakeNotifier{}
	service := NewService(repo, notifier)
	_, err := service.RespondToEventInvite(context.Background(), "event-id", "user-id", InviteStateDeclined)
	require.NoError(t, err)
	require.Equal(t, []notifyCall{{
		userID:           "inviter-id",
		notificationType: notificationInviteResponse,
		payload:          map[string]any{"eventId": "event-id", "actorId": "user-id", "status": "declined"},
	}}, notifier.calls)
}

func TestUpdateEvent_NotifiesInviteesButNotTheOwner(t *testing.T) {
	existing := Event{ID: "event-id", OwnerId: "owner-id", Date: time.Now().Add(48 * time.Hour)}
	updated := Event{ID: "event-id", OwnerId: "owner-id", Name: "renamed"}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
		updateEventFunc: func(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
			return updated, nil
		},
		listEventAttendeesFunc: func(ctx context.Context, eventID string) ([]Attendee, error) {
			return []Attendee{
				{UserID: "owner-id", IsOwner: true},
				{UserID: "invitee-id"},
			}, nil
		},
	}
	notifier := &fakeNotifier{}
	service := NewService(repo, notifier)
	name := "renamed"
	_, err := service.UpdateEvent(context.Background(), UpdateEventPayload{Name: &name}, "event-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, []notifyCall{{
		userID:           "invitee-id",
		notificationType: notificationEventUpdated,
		payload:          map[string]any{"eventId": "event-id"},
	}}, notifier.calls)
}

func TestUpdateEvent_NilNotifier_SkipsAttendeeLookup(t *testing.T) {
	existing := Event{ID: "event-id", OwnerId: "owner-id", Date: time.Now().Add(48 * time.Hour)}
	updated := Event{ID: "event-id", OwnerId: "owner-id", Name: "renamed"}
	repo := &fakeRepository{
		getEventFunc: func(ctx context.Context, eventID string) (Event, error) {
			return existing, nil
		},
		updateEventFunc: func(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
			return updated, nil
		},
	}
	service := NewService(repo, nil)
	name := "renamed"
	event, err := service.UpdateEvent(context.Background(), UpdateEventPayload{Name: &name}, "event-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, updated, event)
}
