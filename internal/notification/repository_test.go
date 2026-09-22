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

		notifications, err := repo.ListByUser(ctx, recipient.Id, 30, 0)
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

		notifications, err := repo.ListByUser(ctx, recipient.Id, 30, 0)
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

		notifications, err := repo.ListByUser(ctx, recipient.Id, 30, 0)
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

		notifications, err := repo.ListByUser(ctx, user.Id, 30, 0)
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

		notifications, err := repo.ListByUser(ctx, userB.Id, 30, 0)
		require.NoError(t, err)
		require.Empty(t, notifications)
	})

	t.Run("ListByUser paginates via limit/offset and CountByUser reports the total", func(t *testing.T) {
		user := authtest.CreateUser(t, pool)
		other := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, other.Id)

		for range 5 {
			require.NoError(t, repo.Create(ctx, user.Id, TypeEventUpdated, map[string]any{"eventId": ev.ID}))
		}

		count, err := repo.CountByUser(ctx, user.Id)
		require.NoError(t, err)
		require.Equal(t, 5, count)

		firstPage, err := repo.ListByUser(ctx, user.Id, 2, 0)
		require.NoError(t, err)
		require.Len(t, firstPage, 2)

		secondPage, err := repo.ListByUser(ctx, user.Id, 2, 2)
		require.NoError(t, err)
		require.Len(t, secondPage, 2)

		lastPage, err := repo.ListByUser(ctx, user.Id, 2, 4)
		require.NoError(t, err)
		require.Len(t, lastPage, 1)
	})

	t.Run("CreateOrRefreshPushSubscription upserts on endpoint", func(t *testing.T) {
		userA := authtest.CreateUser(t, pool)
		userB := authtest.CreateUser(t, pool)

		sub, err := repo.CreateOrRefreshPushSubscription(ctx, userA.Id, "shared-endpoint", "p256dh-1", "auth-1")
		require.NoError(t, err)
		require.Equal(t, userA.Id, sub.UserID)

		refreshed, err := repo.CreateOrRefreshPushSubscription(ctx, userB.Id, "shared-endpoint", "p256dh-2", "auth-2")
		require.NoError(t, err)
		require.Equal(t, sub.ID, refreshed.ID)
		require.Equal(t, userB.Id, refreshed.UserID)
		require.Equal(t, "p256dh-2", refreshed.P256dh)

		subsA, err := repo.ListPushSubscriptionsByUser(ctx, userA.Id)
		require.NoError(t, err)
		require.Empty(t, subsA)

		subsB, err := repo.ListPushSubscriptionsByUser(ctx, userB.Id)
		require.NoError(t, err)
		require.Len(t, subsB, 1)
	})

	t.Run("DeletePushSubscription scopes to the caller and reports not found otherwise", func(t *testing.T) {
		userA := authtest.CreateUser(t, pool)
		userB := authtest.CreateUser(t, pool)

		_, err := repo.CreateOrRefreshPushSubscription(ctx, userA.Id, "userA-endpoint", "p256dh", "auth")
		require.NoError(t, err)

		err = repo.DeletePushSubscription(ctx, userB.Id, "userA-endpoint")
		require.ErrorIs(t, err, ErrPushSubscriptionNotFound)

		err = repo.DeletePushSubscription(ctx, userA.Id, "userA-endpoint")
		require.NoError(t, err)

		subs, err := repo.ListPushSubscriptionsByUser(ctx, userA.Id)
		require.NoError(t, err)
		require.Empty(t, subs)
	})

	t.Run("DeletePushSubscriptionByID removes regardless of owner", func(t *testing.T) {
		user := authtest.CreateUser(t, pool)
		sub, err := repo.CreateOrRefreshPushSubscription(ctx, user.Id, "by-id-endpoint", "p256dh", "auth")
		require.NoError(t, err)

		require.NoError(t, repo.DeletePushSubscriptionByID(ctx, sub.ID))

		subs, err := repo.ListPushSubscriptionsByUser(ctx, user.Id)
		require.NoError(t, err)
		require.Empty(t, subs)
	})

	t.Run("NotificationContext resolves names and tolerates empty/unknown ids", func(t *testing.T) {
		actor := authtest.CreateUser(t, pool)
		ev := eventtest.CreateEvent(t, pool, actor.Id)

		eventName, actorName, err := repo.NotificationContext(ctx, ev.ID, actor.Id)
		require.NoError(t, err)
		require.Equal(t, ev.Name, eventName)
		require.Equal(t, actor.Name, actorName)

		eventName, actorName, err = repo.NotificationContext(ctx, "", "")
		require.NoError(t, err)
		require.Empty(t, eventName)
		require.Empty(t, actorName)
	})
}
