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

		updated, err := repo.RespondToEventInvite(ctx, createdEvent.ID, invitee.Id, InviteStateAccepted)
		require.NoError(t, err)
		require.Equal(t, InviteStateAccepted, updated.Status)

		_, err = repo.RespondToEventInvite(ctx, createdEvent.ID, uuid.NewString(), InviteStateAccepted)
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
		_, err = repo.RespondToEventInvite(ctx, createdEvent.ID, declined.Id, InviteStateDeclined)
		require.NoError(t, err)

		attendees, err := repo.ListEventAttendees(ctx, createdEvent.ID)
		require.NoError(t, err)
		require.Len(t, attendees, 2)
		ids := []string{attendees[0].UserID, attendees[1].UserID}
		require.Contains(t, ids, owner.Id)
		require.Contains(t, ids, accepted.Id)
		require.NotContains(t, ids, declined.Id)
	})
}
