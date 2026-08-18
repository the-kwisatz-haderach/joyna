package authtest

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
)

func CreateUser(t *testing.T, pool *pgxpool.Pool) auth.User {
	t.Helper()

	repo := auth.NewRepository(pool)
	user, err := repo.CreateUser(context.Background(), "Test User", uuid.NewString()+"@test.dev", "hashed-password")
	require.NoError(t, err)

	return user
}
