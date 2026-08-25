//go:build integration
// +build integration

package network

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/auth/authtest"
	"github.com/the-kwisatz-haderach/joyna/internal/event"
	"github.com/the-kwisatz-haderach/joyna/internal/group"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestNetworkRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)
	groupRepo := group.NewRepository(pool)
	eventRepo := event.NewRepository(pool)

	t.Run("CreateConnection and ListConnections", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)

		created, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.NoError(t, err)
		require.Equal(t, contact.Id, created.ContactID)
		require.Equal(t, contact.Name, created.ContactName)
		require.Equal(t, contact.Email, created.ContactEmail)
		require.False(t, created.IsFavorite)
		require.Nil(t, created.GroupID)

		connections, err := repo.ListConnections(ctx, owner.Id)
		require.NoError(t, err)
		require.Len(t, connections, 1)
		require.Equal(t, contact.Id, connections[0].ContactID)
	})

	t.Run("CreateConnection with group", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)
		g, err := groupRepo.CreateGroup(ctx, group.CreateGroupPayload{Name: "Close Friends"}, owner.Id)
		require.NoError(t, err)

		created, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id, GroupID: &g.ID}, owner.Id)
		require.NoError(t, err)
		require.NotNil(t, created.GroupID)
		require.Equal(t, g.ID, *created.GroupID)
		require.NotNil(t, created.GroupName)
		require.Equal(t, g.Name, *created.GroupName)
	})

	t.Run("CreateConnection contact not found", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: uuid.NewString()}, owner.Id)
		require.ErrorIs(t, err, ErrContactNotFound)
	})

	t.Run("CreateConnection group not found", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)
		missingGroupID := uuid.NewString()
		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id, GroupID: &missingGroupID}, owner.Id)
		require.ErrorIs(t, err, ErrGroupNotFound)
	})

	t.Run("CreateConnection already exists", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)
		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.NoError(t, err)

		_, err = repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.ErrorIs(t, err, ErrConnectionAlreadyExists)
	})

	t.Run("UpdateConnection favorite and group", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)
		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.NoError(t, err)

		g, err := groupRepo.CreateGroup(ctx, group.CreateGroupPayload{Name: "Book Club"}, owner.Id)
		require.NoError(t, err)

		isFavorite := true
		updated, err := repo.UpdateConnection(ctx, UpdateConnectionPayload{GroupID: &g.ID, IsFavorite: &isFavorite}, contact.Id, owner.Id)
		require.NoError(t, err)
		require.True(t, updated.IsFavorite)
		require.NotNil(t, updated.GroupID)
		require.Equal(t, g.ID, *updated.GroupID)

		emptyGroupID := ""
		cleared, err := repo.UpdateConnection(ctx, UpdateConnectionPayload{GroupID: &emptyGroupID}, contact.Id, owner.Id)
		require.NoError(t, err)
		require.Nil(t, cleared.GroupID)
		require.True(t, cleared.IsFavorite)
	})

	t.Run("UpdateConnection not found", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		_, err := repo.UpdateConnection(ctx, UpdateConnectionPayload{}, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrConnectionNotFound)
	})

	t.Run("ListPotentialConnections", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		attendee := authtest.CreateUser(t, pool)
		stranger := authtest.CreateUser(t, pool)
		alreadyConnected := authtest.CreateUser(t, pool)

		ownedEvent, err := eventRepo.CreateEvent(ctx, event.CreateEventPayload{Type: "dinner"}, owner.Id)
		require.NoError(t, err)

		_, err = eventRepo.CreateEventInvite(ctx, event.CreateEventInvitePayload{EventID: ownedEvent.ID, InvitedUserID: attendee.Id}, owner.Id)
		require.NoError(t, err)
		_, err = eventRepo.CreateEventInvite(ctx, event.CreateEventInvitePayload{EventID: ownedEvent.ID, InvitedUserID: alreadyConnected.Id}, owner.Id)
		require.NoError(t, err)

		_, err = repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: alreadyConnected.Id}, owner.Id)
		require.NoError(t, err)

		strangerEvent, err := eventRepo.CreateEvent(ctx, event.CreateEventPayload{Type: "dinner"}, stranger.Id)
		require.NoError(t, err)
		_, err = eventRepo.CreateEventInvite(ctx, event.CreateEventInvitePayload{EventID: strangerEvent.ID, InvitedUserID: attendee.Id}, stranger.Id)
		require.NoError(t, err)

		potential, err := repo.ListPotentialConnections(ctx, owner.Id)
		require.NoError(t, err)

		ids := make(map[string]int)
		for _, p := range potential {
			ids[p.UserID] = p.SharedEventCount
		}
		require.Contains(t, ids, attendee.Id)
		require.Equal(t, 1, ids[attendee.Id])
		require.NotContains(t, ids, owner.Id)
		require.NotContains(t, ids, alreadyConnected.Id)
		require.NotContains(t, ids, stranger.Id)
	})
}
