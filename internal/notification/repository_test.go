//go:build integration
// +build integration

package notification

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/auth/authtest"
	"github.com/the-kwisatz-haderach/joyna/internal/event/eventtest"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestNotificationRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)

	t.Run("Create and ListByUser resolve event and actor names", func(t *testing.T) {
		actor := authtest.CreateUser(t, pool)
		recipient := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, actor.Id)

		err := repo.Create(ctx, recipient.Id, TypeEventInvite, map[string]any{
			"eventId": ev.ID,
			"actorId": actor.Id,
		})
		require.NoError(t, err)

		notifications, err := repo.ListByUser(ctx, recipient.Id)
		require.NoError(t, err)
		require.Len(t, notifications, 1)

		n := notifications[0]
		require.Equal(t, TypeEventInvite, n.Type)
		require.NotNil(t, n.EventID)
		require.Equal(t, ev.ID, *n.EventID)
		require.NotNil(t, n.EventName)
		require.Equal(t, ev.Name, *n.EventName)
		require.NotNil(t, n.ActorID)
		require.Equal(t, actor.Id, *n.ActorID)
		require.NotNil(t, n.ActorName)
		require.Equal(t, actor.Name, *n.ActorName)
		require.Nil(t, n.Status)
		require.False(t, n.IsRead)
	})

	t.Run("Create with status payload for invite responses", func(t *testing.T) {
		actor := authtest.CreateUser(t, pool)
		recipient := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, actor.Id)

		err := repo.Create(ctx, recipient.Id, TypeInviteResponse, map[string]any{
			"eventId": ev.ID,
			"actorId": actor.Id,
			"status":  "accepted",
		})
		require.NoError(t, err)

		notifications, err := repo.ListByUser(ctx, recipient.Id)
		require.NoError(t, err)
		require.Len(t, notifications, 1)
		require.NotNil(t, notifications[0].Status)
		require.Equal(t, "accepted", *notifications[0].Status)
	})

	t.Run("Create without an actor leaves ActorID/ActorName nil", func(t *testing.T) {
		owner := authtest.CreateUser(t, pool)
		recipient := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, owner.Id)

		err := repo.Create(ctx, recipient.Id, TypeEventUpdated, map[string]any{
			"eventId": ev.ID,
		})
		require.NoError(t, err)

		notifications, err := repo.ListByUser(ctx, recipient.Id)
		require.NoError(t, err)
		require.Len(t, notifications, 1)
		require.Nil(t, notifications[0].ActorID)
		require.Nil(t, notifications[0].ActorName)
	})

	t.Run("MarkAllAsRead and CountUnread", func(t *testing.T) {
		user := authtest.CreateUser(t, pool)
		other := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, other.Id)

		require.NoError(t, repo.Create(ctx, user.Id, TypeEventInvite, map[string]any{"eventId": ev.ID, "actorId": other.Id}))
		require.NoError(t, repo.Create(ctx, user.Id, TypeEventUpdated, map[string]any{"eventId": ev.ID}))

		count, err := repo.CountUnread(ctx, user.Id)
		require.NoError(t, err)
		require.Equal(t, 2, count)

		require.NoError(t, repo.MarkAllAsRead(ctx, user.Id))

		count, err = repo.CountUnread(ctx, user.Id)
		require.NoError(t, err)
		require.Equal(t, 0, count)

		notifications, err := repo.ListByUser(ctx, user.Id)
		require.NoError(t, err)
		require.Len(t, notifications, 2)
		for _, n := range notifications {
			require.True(t, n.IsRead)
		}
	})

	t.Run("ListByUser only returns the requesting user's notifications", func(t *testing.T) {
		userA := authtest.CreateUser(t, pool)
		userB := authtest.CreateUser(t, pool)
		other := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, other.Id)

		require.NoError(t, repo.Create(ctx, userA.Id, TypeEventInvite, map[string]any{"eventId": ev.ID, "actorId": other.Id}))

		notifications, err := repo.ListByUser(ctx, userB.Id)
		require.NoError(t, err)
		require.Empty(t, notifications)
	})
}
