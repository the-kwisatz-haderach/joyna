package dbtest

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/utils"
)

func InitTestContainer(ctx context.Context) (*postgres.PostgresContainer, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	dbConfig, err := pgx.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	pgContainer, err := postgres.Run(
		ctx,
		"postgres:16-alpine",
		postgres.WithDatabase(dbConfig.Database),
		postgres.WithUsername(dbConfig.User),
		postgres.WithPassword(dbConfig.Password),
		postgres.BasicWaitStrategies(),
		postgres.WithSQLDriver("pgx"),
	)

	if err != nil {
		log.Printf("failed to start container: %s", err)
		return nil, err
	}

	return pgContainer, err

}

func NewPoolWithMigrations(ctx context.Context, pgContainer *postgres.PostgresContainer) (*pgxpool.Pool, error) {
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return &pgxpool.Pool{}, err
	}

	pool, err := pgxpool.New(ctx, connStr)

	if err != nil {
		return &pgxpool.Pool{}, err
	}

	files, err := filepath.Glob(filepath.Join(utils.ProjectRoot(), "migrations", "*.up.sql"))
	if err != nil {
		return &pgxpool.Pool{}, err
	}
	sort.Strings(files)

	for _, file := range files {
		sql, err := os.ReadFile(file)
		if err != nil {
			return &pgxpool.Pool{}, err
		}
		_, err = pool.Exec(ctx, string(sql))
		if err != nil {
			return &pgxpool.Pool{}, err
		}
	}

	return pool, nil
}
