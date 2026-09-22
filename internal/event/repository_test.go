//go:build integration
// +build integration

package event

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/auth/authtest"
	"github.com/the-kwisatz-haderach/joyna/internal/notification"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestEventRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)
	user := authtest.CreateUser(t, pool)

	t.Run("CreateEvent with empty payload", func(t *testing.T) {
		var payload CreateEventPayload
		payload.Type = "dinner"
		event, err := repo.CreateEvent(ctx, payload, user.Id)
		require.NoError(t, err)
		require.NoError(t, uuid.Validate(event.ID))
		require.Equal(t, 0, event.DefaultSpreadAllowed)
		require.IsType(t, time.Time{}, event.Date)
		require.IsType(t, time.Time{}, event.CreatedAt)
		require.Equal(t, "", event.Description)
		require.Equal(t, "", event.Location)
		require.Equal(t, "", event.Name)
		require.Equal(t, user.Id, event.OwnerId)
		require.IsType(t, &time.Time{}, event.RsvpDeadline)
		require.Equal(t, payload.Type, event.Type)
	})

	t.Run("CreateEvent and UpdateEvent with mood", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		mood := Mood("chill")
		createdEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour), Mood: &mood}, owner.Id)
		require.NoError(t, err)
		require.NotNil(t, createdEvent.Mood)
		require.Equal(t, mood, *createdEvent.Mood)

		newMood := Mood("party")
		updatedEvent, err := repo.UpdateEvent(ctx, UpdateEventPayload{Mood: &newMood}, createdEvent.ID, owner.Id)
		require.NoError(t, err)
		require.NotNil(t, updatedEvent.Mood)
		require.Equal(t, newMood, *updatedEvent.Mood)
	})

	t.Run("CreateEvent with invalid mood", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invalidMood := Mood("nonexistent")
		_, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour), Mood: &invalidMood}, owner.Id)
		require.ErrorIs(t, err, ErrInvalidEventMood)
	})

	t.Run("GetEventInvite and RespondToEventInvite", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invitee := authtest.CreateUser(t, pool)
		createdEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour)}, owner.Id)
		require.NoError(t, err)

		_, err = repo.GetEventInvite(ctx, createdEvent.ID, invitee.Id)
		require.ErrorIs(t, err, ErrInviteNotFound)

		invite, err := repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: createdEvent.ID, InvitedUserID: invitee.Id}, owner.Id)
		require.NoError(t, err)
		require.Equal(t, InviteStatePending, invite.Status)

		fetched, err := repo.GetEventInvite(ctx, createdEvent.ID, invitee.Id)
		require.NoError(t, err)
		require.Equal(t, invite, fetched)

		updated, err := repo.RespondToEventInvite(ctx, createdEvent.ID, invitee.Id, InviteStateAccepted, nil)
		require.NoError(t, err)
		require.Equal(t, InviteStateAccepted, updated.Status)

		_, err = repo.RespondToEventInvite(ctx, createdEvent.ID, uuid.NewString(), InviteStateAccepted, nil)
		require.ErrorIs(t, err, ErrInviteNotFound)
	})

	t.Run("ListEventAttendees", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		accepted := authtest.CreateUser(t, pool)
		declined := authtest.CreateUser(t, pool)
		createdEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour)}, owner.Id)
		require.NoError(t, err)

		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: createdEvent.ID, InvitedUserID: accepted.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: createdEvent.ID, InvitedUserID: declined.Id}, owner.Id)
		require.NoError(t, err)
		reason := "Already have plans that evening, sorry!"
		_, err = repo.RespondToEventInvite(ctx, createdEvent.ID, declined.Id, InviteStateDeclined, &reason)
		require.NoError(t, err)

		attendees, err := repo.ListEventAttendees(ctx, createdEvent.ID)
		require.NoError(t, err)
		require.Len(t, attendees, 3)

		byID := make(map[string]Attendee, len(attendees))
		for _, a := range attendees {
			byID[a.UserID] = a
		}

		require.True(t, byID[owner.Id].IsOwner)
		require.Nil(t, byID[owner.Id].DeclineReason)

		require.False(t, byID[accepted.Id].IsOwner)
		require.Equal(t, InviteStateAccepted, byID[accepted.Id].Status)
		require.Equal(t, owner.Id, byID[accepted.Id].InvitedBy)
		require.Nil(t, byID[accepted.Id].DeclineReason)

		require.False(t, byID[declined.Id].IsOwner)
		require.Equal(t, InviteStateDeclined, byID[declined.Id].Status)
		require.Equal(t, owner.Id, byID[declined.Id].InvitedBy)
		require.NotNil(t, byID[declined.Id].DeclineReason)
		require.Equal(t, reason, *byID[declined.Id].DeclineReason)
	})

	t.Run("DeleteEventInvite", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invitee := authtest.CreateUser(t, pool)
		createdEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour)}, owner.Id)
		require.NoError(t, err)

		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: createdEvent.ID, InvitedUserID: invitee.Id}, owner.Id)
		require.NoError(t, err)

		err = repo.DeleteEventInvite(ctx, createdEvent.ID, invitee.Id)
		require.NoError(t, err)

		_, err = repo.GetEventInvite(ctx, createdEvent.ID, invitee.Id)
		require.ErrorIs(t, err, ErrInviteNotFound)

		err = repo.DeleteEventInvite(ctx, createdEvent.ID, invitee.Id)
		require.ErrorIs(t, err, ErrInviteNotFound)
	})

	t.Run("GetEventsByOwner enriches events with the viewer's relationship to them", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invitee := authtest.CreateUser(t, pool)
		ownedEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(24 * time.Hour)}, owner.Id)
		require.NoError(t, err)
		invitedEvent, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: time.Now().Add(48 * time.Hour)}, invitee.Id)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: invitedEvent.ID, InvitedUserID: owner.Id}, invitee.Id)
		require.NoError(t, err)
		_, err = repo.RespondToEventInvite(ctx, invitedEvent.ID, owner.Id, InviteStateAccepted, nil)
		require.NoError(t, err)

		views, err := repo.GetEventsByOwner(ctx, owner.Id, EventSortFieldDate, SortOrderAsc, EventListScopeAll)
		require.NoError(t, err)
		require.Len(t, views, 2)

		byID := make(map[string]EventView, len(views))
		for _, v := range views {
			byID[v.ID] = v
		}

		require.True(t, byID[ownedEvent.ID].IsOwner)
		require.Nil(t, byID[ownedEvent.ID].ViewerInviteStatus)

		require.False(t, byID[invitedEvent.ID].IsOwner)
		require.NotNil(t, byID[invitedEvent.ID].ViewerInviteStatus)
		require.Equal(t, InviteStateAccepted, *byID[invitedEvent.ID].ViewerInviteStatus)
	})

	t.Run("ListPendingInvitesWithRsvpDeadlineOn excludes already-notified invites", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invitee := authtest.CreateUser(t, pool)
		alreadyNotified := authtest.CreateUser(t, pool)
		deadline := time.Now().Add(24 * time.Hour)

		ev, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: deadline.Add(24 * time.Hour), RsvpDeadline: &deadline}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: invitee.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: alreadyNotified.Id}, owner.Id)
		require.NoError(t, err)

		notificationRepo := notification.NewRepository(pool)
		require.NoError(t, notificationRepo.Create(ctx, alreadyNotified.Id, notification.TypeRsvpDeadlineReminder, map[string]any{"eventId": ev.ID}))

		invites, err := repo.ListPendingInvitesWithRsvpDeadlineOn(ctx, deadline)
		require.NoError(t, err)
		require.Equal(t, []ReminderInvite{{EventID: ev.ID, InvitedUserID: invitee.Id}}, invites)

		// A declined invite isn't pending, so it's excluded even with a matching deadline.
		declinedInvitee := authtest.CreateUser(t, pool)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: declinedInvitee.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.RespondToEventInvite(ctx, ev.ID, declinedInvitee.Id, InviteStateDeclined, nil)
		require.NoError(t, err)

		invites, err = repo.ListPendingInvitesWithRsvpDeadlineOn(ctx, deadline)
		require.NoError(t, err)
		require.Equal(t, []ReminderInvite{{EventID: ev.ID, InvitedUserID: invitee.Id}}, invites)

		// A day with no matching deadline returns nothing.
		invites, err = repo.ListPendingInvitesWithRsvpDeadlineOn(ctx, deadline.AddDate(0, 0, 5))
		require.NoError(t, err)
		require.Empty(t, invites)
	})

	t.Run("ListAcceptedInvitesWithEventOn excludes already-notified invites", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		invitee := authtest.CreateUser(t, pool)
		alreadyNotified := authtest.CreateUser(t, pool)
		eventDate := time.Now().Add(24 * time.Hour)

		ev, err := repo.CreateEvent(ctx, CreateEventPayload{Type: "dinner", Date: eventDate}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: invitee.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.RespondToEventInvite(ctx, ev.ID, invitee.Id, InviteStateAccepted, nil)
		require.NoError(t, err)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: alreadyNotified.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.RespondToEventInvite(ctx, ev.ID, alreadyNotified.Id, InviteStateAccepted, nil)
		require.NoError(t, err)

		notificationRepo := notification.NewRepository(pool)
		require.NoError(t, notificationRepo.Create(ctx, alreadyNotified.Id, notification.TypeEventStartingToday, map[string]any{"eventId": ev.ID}))

		invites, err := repo.ListAcceptedInvitesWithEventOn(ctx, eventDate)
		require.NoError(t, err)
		require.Equal(t, []ReminderInvite{{EventID: ev.ID, InvitedUserID: invitee.Id}}, invites)

		// A pending invite isn't accepted, so it's excluded even on the event's date.
		pendingInvitee := authtest.CreateUser(t, pool)
		_, err = repo.CreateEventInvite(ctx, CreateEventInvitePayload{EventID: ev.ID, InvitedUserID: pendingInvitee.Id}, owner.Id)
		require.NoError(t, err)

		invites, err = repo.ListAcceptedInvitesWithEventOn(ctx, eventDate)
		require.NoError(t, err)
		require.Equal(t, []ReminderInvite{{EventID: ev.ID, InvitedUserID: invitee.Id}}, invites)

		// A day that doesn't match the event's date returns nothing.
		invites, err = repo.ListAcceptedInvitesWithEventOn(ctx, eventDate.AddDate(0, 0, 5))
		require.NoError(t, err)
		require.Empty(t, invites)
	})
}
