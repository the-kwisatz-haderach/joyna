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
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)

	t.Run("CreateUser", func(t *testing.T) {
		var profilePcKey *string
		name := "Test User"
		email := "test@test.dev"
		user, err := repo.CreateUser(context.Background(), name, email, "hashed-password", nil)
		require.NoError(t, err)
		require.NoError(t, uuid.Validate(user.Id))
		require.False(t, user.JoinedAt.IsZero())
		require.Equal(t, profilePcKey, user.ProfilePictureKey)
		require.Equal(t, name, user.Name)
		require.Equal(t, email, user.Email)
		require.Nil(t, user.Address)
	})

	t.Run("CreateUser with address", func(t *testing.T) {
		name := "Addressed User"
		email := "addressed_test@test.dev"
		address := "123 Main St"
		user, err := repo.CreateUser(context.Background(), name, email, "hashed-password", &address)
		require.NoError(t, err)
		require.Equal(t, &address, user.Address)
	})

	t.Run("CreateUser conflict for same email", func(t *testing.T) {
		name := "Other User"
		email := "other_test@test.dev"
		_, err := repo.CreateUser(context.Background(), name, email, "hashed-password", nil)
		require.NoError(t, err)
		_, err = repo.CreateUser(context.Background(), name, email, "hashed-password", nil)
		require.ErrorIs(t, err, ErrUserAlreadyExists)
	})

	t.Run("GetUserByEmail", func(t *testing.T) {
		name := "Test User"
		email := "new_test@test.dev"
		passHash := "hashed-password"
		address := "456 Side St"
		created, err := repo.CreateUser(context.Background(), name, email, passHash, &address)
		require.NoError(t, err)
		user, userPassHash, err := repo.GetUserByEmail(ctx, email)
		require.NoError(t, err)
		require.Equal(t, created.Email, user.Email)
		require.Equal(t, created.Name, user.Name)
		require.Equal(t, created.JoinedAt, user.JoinedAt)
		require.Equal(t, created.Id, user.Id)
		require.Equal(t, &address, user.Address)
		require.Equal(t, userPassHash, passHash)
	})

	t.Run("UpdateUser", func(t *testing.T) {
		name := "Update Me"
		email := "update_test@test.dev"
		address := "1 Old St"
		created, err := repo.CreateUser(context.Background(), name, email, "hashed-password", &address)
		require.NoError(t, err)

		newName := "Updated Name"
		newAddress := "2 New St"
		updated, err := repo.UpdateUser(context.Background(), UpdateUserPayload{Name: &newName, Address: &newAddress}, created.Id)
		require.NoError(t, err)
		require.Equal(t, created.Id, updated.Id)
		require.Equal(t, newName, updated.Name)
		require.Equal(t, &newAddress, updated.Address)
		require.Equal(t, created.Email, updated.Email)
	})

	t.Run("UpdateUser partial update leaves omitted fields unchanged", func(t *testing.T) {
		name := "Partial Update"
		email := "partial_update_test@test.dev"
		address := "1 Kept St"
		created, err := repo.CreateUser(context.Background(), name, email, "hashed-password", &address)
		require.NoError(t, err)

		newName := "Only Name Changed"
		updated, err := repo.UpdateUser(context.Background(), UpdateUserPayload{Name: &newName}, created.Id)
		require.NoError(t, err)
		require.Equal(t, newName, updated.Name)
		require.Equal(t, &address, updated.Address)
	})

	t.Run("UpdateUser not found", func(t *testing.T) {
		name := "Missing"
		_, err := repo.UpdateUser(context.Background(), UpdateUserPayload{Name: &name}, uuid.NewString())
		require.ErrorIs(t, err, ErrUserNotFound)
	})
}
