//go:build integration
// +build integration

package auth

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestAuthRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	defer pool.Close()
	require.NoError(t, err)

	repo := NewRepository(pool)

	t.Run("CreateUser", func(t *testing.T) {
		var profilePcKey *string
		name := "Test User"
		email := "test@test.dev"
		user, err := repo.CreateUser(context.Background(), name, email, "hashed-password")
		require.NoError(t, err)
		require.NoError(t, uuid.Validate(user.Id))
		require.False(t, user.JoinedAt.IsZero())
		require.Equal(t, profilePcKey, user.ProfilePictureKey)
		require.Equal(t, name, user.Name)
		require.Equal(t, email, user.Email)
	})

	t.Run("CreateUser conflict for same email", func(t *testing.T) {
		name := "Other User"
		email := "other_test@test.dev"
		_, err := repo.CreateUser(context.Background(), name, email, "hashed-password")
		require.NoError(t, err)
		_, err = repo.CreateUser(context.Background(), name, email, "hashed-password")
		require.ErrorIs(t, err, ErrUserAlreadyExists)
	})

	t.Run("GetUserByEmail", func(t *testing.T) {
		name := "Test User"
		email := "new_test@test.dev"
		passHash := "hashed-password"
		created, err := repo.CreateUser(context.Background(), name, email, passHash)
		require.NoError(t, err)
		user, userPassHash, err := repo.GetUserByEmail(ctx, email)
		require.NoError(t, err)
		require.Equal(t, created.Email, user.Email)
		require.Equal(t, created.Name, user.Name)
		require.Equal(t, created.JoinedAt, user.JoinedAt)
		require.Equal(t, created.Id, user.Id)
		require.Equal(t, userPassHash, passHash)
	})
}
