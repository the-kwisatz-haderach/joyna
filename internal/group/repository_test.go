//go:build integration
// +build integration

package group

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/auth/authtest"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestGroupRepository(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)
	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
	require.NoError(t, err)
	defer pool.Close()

	repo := NewRepository(pool)
	owner := authtest.CreateUser(t, pool)

	t.Run("CreateGroup", func(t *testing.T) {
		group, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "friends"}, owner.Id)
		require.NoError(t, err)
		require.NoError(t, uuid.Validate(group.ID))
		require.Equal(t, "friends", group.Name)
		require.Equal(t, owner.Id, group.OwnerID)
		require.False(t, group.IsFavorite)
		require.False(t, group.CreatedAt.IsZero())
	})

	t.Run("CreateGroup conflict for same name and owner", func(t *testing.T) {
		_, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "colleagues"}, owner.Id)
		require.NoError(t, err)
		_, err = repo.CreateGroup(ctx, CreateGroupPayload{Name: "colleagues"}, owner.Id)
		require.ErrorIs(t, err, ErrGroupNameTaken)
	})

	t.Run("UpdateGroup", func(t *testing.T) {
		created, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "family"}, owner.Id)
		require.NoError(t, err)

		newName := "renamed family"
		isFavorite := true
		updated, err := repo.UpdateGroup(ctx, UpdateGroupPayload{Name: &newName, IsFavorite: &isFavorite}, created.ID, owner.Id)
		require.NoError(t, err)
		require.Equal(t, newName, updated.Name)
		require.True(t, updated.IsFavorite)
	})

	t.Run("UpdateGroup not found", func(t *testing.T) {
		newName := "doesn't matter"
		_, err := repo.UpdateGroup(ctx, UpdateGroupPayload{Name: &newName}, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrGroupNotFound)
	})

	t.Run("UpdateGroup name conflict", func(t *testing.T) {
		_, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "book club"}, owner.Id)
		require.NoError(t, err)
		created, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "chess club"}, owner.Id)
		require.NoError(t, err)

		conflictingName := "book club"
		_, err = repo.UpdateGroup(ctx, UpdateGroupPayload{Name: &conflictingName}, created.ID, owner.Id)
		require.ErrorIs(t, err, ErrGroupNameTaken)
	})

	t.Run("DeleteGroup", func(t *testing.T) {
		created, err := repo.CreateGroup(ctx, CreateGroupPayload{Name: "to be deleted"}, owner.Id)
		require.NoError(t, err)

		err = repo.DeleteGroup(ctx, created.ID, owner.Id)
		require.NoError(t, err)

		newName := "doesn't matter"
		_, err = repo.UpdateGroup(ctx, UpdateGroupPayload{Name: &newName}, created.ID, owner.Id)
		require.ErrorIs(t, err, ErrGroupNotFound)
	})

	t.Run("DeleteGroup not found", func(t *testing.T) {
		err := repo.DeleteGroup(ctx, uuid.NewString(), owner.Id)
		require.ErrorIs(t, err, ErrGroupNotFound)
	})
}
