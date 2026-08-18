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
	defer pool.Close()
	require.NoError(t, err)

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
}
