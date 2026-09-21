package eventtest

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"github.com/the-kwisatz-haderach/joyna/internal/event"
)

func CreateEvent(t *testing.T, pool *pgxpool.Pool, ownerID string) event.Event {
	t.Helper()

	repo := event.NewRepository(pool)
	created, err := repo.CreateEvent(context.Background(), event.CreateEventPayload{
		Name: "Test Event",
		Type: "dinner",
		Date: time.Now().Add(24 * time.Hour),
	}, ownerID)
	require.NoError(t, err)

	return created
}
