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

	t.Run("ListConnections includes events together count", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)
		stranger := authtest.CreateUser(t, pool)

		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: stranger.Id}, owner.Id)
		require.NoError(t, err)

		ownedEvent, err := eventRepo.CreateEvent(ctx, event.CreateEventPayload{Type: "dinner"}, owner.Id)
		require.NoError(t, err)
		_, err = eventRepo.CreateEventInvite(ctx, event.CreateEventInvitePayload{EventID: ownedEvent.ID, InvitedUserID: contact.Id}, owner.Id)
		require.NoError(t, err)

		contactsEvent, err := eventRepo.CreateEvent(ctx, event.CreateEventPayload{Type: "dinner"}, contact.Id)
		require.NoError(t, err)
		_, err = eventRepo.CreateEventInvite(ctx, event.CreateEventInvitePayload{EventID: contactsEvent.ID, InvitedUserID: owner.Id}, contact.Id)
		require.NoError(t, err)

		connections, err := repo.ListConnections(ctx, owner.Id)
		require.NoError(t, err)

		counts := make(map[string]int)
		for _, c := range connections {
			counts[c.ContactID] = c.EventsTogetherCount
		}
		require.Equal(t, 2, counts[contact.Id])
		require.Equal(t, 0, counts[stranger.Id])
	})

	t.Run("FindUserByEmail", func(t *testing.T) {
		user := authtest.CreateUser(t, pool)

		found, err := repo.FindUserByEmail(ctx, user.Email)
		require.NoError(t, err)
		require.Equal(t, user.Id, found.UserID)
		require.Equal(t, user.Name, found.Name)
		require.Equal(t, user.Email, found.Email)

		_, err = repo.FindUserByEmail(ctx, "no-such-user@example.com")
		require.ErrorIs(t, err, ErrUserNotFound)
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

	t.Run("DeleteConnection", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		contact := authtest.CreateUser(t, pool)

		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: contact.Id}, owner.Id)
		require.NoError(t, err)

		err = repo.DeleteConnection(ctx, contact.Id, owner.Id)
		require.NoError(t, err)

		connections, err := repo.ListConnections(ctx, owner.Id)
		require.NoError(t, err)
		require.Empty(t, connections)
	})

	t.Run("DeleteConnection not found", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)

		err := repo.DeleteConnection(ctx, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrConnectionNotFound)
	})

	t.Run("CreateOrRefreshInvite is idempotent per inviter and email", func(t *testing.T) {
		inviter := authtest.CreateUser(t, pool)

		first, err := repo.CreateOrRefreshInvite(ctx, inviter.Id, "invitee@example.com")
		require.NoError(t, err)
		require.Equal(t, inviter.Id, first.InviterID)
		require.Equal(t, "invitee@example.com", first.InvitedEmail)
		require.Nil(t, first.AcceptedAt)

		second, err := repo.CreateOrRefreshInvite(ctx, inviter.Id, "invitee@example.com")
		require.NoError(t, err)
		require.Equal(t, first.ID, second.ID, "re-inviting the same pending email should refresh, not duplicate")

		pending, err := repo.ListPendingInvitesByEmail(ctx, "invitee@example.com")
		require.NoError(t, err)
		require.Len(t, pending, 1)
	})

	t.Run("ListPendingInvitesByEmail returns invites from multiple inviters, excludes accepted", func(t *testing.T) {
		inviterA := authtest.CreateUser(t, pool)
		inviterB := authtest.CreateUser(t, pool)

		inviteA, err := repo.CreateOrRefreshInvite(ctx, inviterA.Id, "multi@example.com")
		require.NoError(t, err)
		_, err = repo.CreateOrRefreshInvite(ctx, inviterB.Id, "multi@example.com")
		require.NoError(t, err)

		pending, err := repo.ListPendingInvitesByEmail(ctx, "multi@example.com")
		require.NoError(t, err)
		require.Len(t, pending, 2)

		require.NoError(t, repo.MarkInviteAccepted(ctx, inviteA.ID))

		pending, err = repo.ListPendingInvitesByEmail(ctx, "multi@example.com")
		require.NoError(t, err)
		require.Len(t, pending, 1)
		require.Equal(t, inviterB.Id, pending[0].InviterID)
	})

	t.Run("MarkInviteAccepted not found", func(t *testing.T) {
		err := repo.MarkInviteAccepted(ctx, uuid.NewString())
		require.ErrorIs(t, err, ErrInviteNotFound)
	})

	t.Run("CreateMutualConnection connects both directions", func(t *testing.T) {
		userA := authtest.CreateUser(t, pool)
		userB := authtest.CreateUser(t, pool)

		err := repo.CreateMutualConnection(ctx, userA.Id, userB.Id)
		require.NoError(t, err)

		aConnections, err := repo.ListConnections(ctx, userA.Id)
		require.NoError(t, err)
		require.Len(t, aConnections, 1)
		require.Equal(t, userB.Id, aConnections[0].ContactID)

		bConnections, err := repo.ListConnections(ctx, userB.Id)
		require.NoError(t, err)
		require.Len(t, bConnections, 1)
		require.Equal(t, userA.Id, bConnections[0].ContactID)
	})

	t.Run("CreateMutualConnection is safe when one direction already exists", func(t *testing.T) {
		userA := authtest.CreateUser(t, pool)
		userB := authtest.CreateUser(t, pool)

		_, err := repo.CreateConnection(ctx, CreateConnectionPayload{ContactID: userB.Id}, userA.Id)
		require.NoError(t, err)

		err = repo.CreateMutualConnection(ctx, userA.Id, userB.Id)
		require.NoError(t, err)

		bConnections, err := repo.ListConnections(ctx, userB.Id)
		require.NoError(t, err)
		require.Len(t, bConnections, 1)
		require.Equal(t, userA.Id, bConnections[0].ContactID)
	})
}
