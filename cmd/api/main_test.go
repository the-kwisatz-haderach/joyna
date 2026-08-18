//go:build integration
// +build integration

package main

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/dbtest"
)

func TestPostgresConnection(t *testing.T) {
	ctx := context.Background()
	pgContainer, err := dbtest.InitTestContainer(ctx)

	testcontainers.CleanupContainer(t, pgContainer)
	require.NoError(t, err)

	t.Run("test migrations setup", func(t *testing.T) {
		pool, err := dbtest.NewPoolWithMigrations(ctx, pgContainer)
		defer pool.Close()
		require.NoError(t, err)

		_, err = pool.Exec(ctx, "INSERT INTO users(name, email) VALUES ($1, $2)", "John Doe", "john.doe@test.com")
		require.NoError(t, err)

		var (
			name  string
			email string
		)
		err = pool.QueryRow(ctx, "SELECT name, email FROM users LIMIT 1").Scan(&name, &email)

		require.NoError(t, err)
		require.EqualValues(t, "John Doe", name)
		require.EqualValues(t, "john.doe@test.com", email)
	})
}
