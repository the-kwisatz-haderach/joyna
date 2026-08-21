package db

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxPingAttempts = 5
	pingRetryDelay  = 1 * time.Second
)

func New(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("creating db pool: %w", err)
	}

	var pingErr error
	for attempt := 1; attempt <= maxPingAttempts; attempt++ {
		if pingErr = pool.Ping(ctx); pingErr == nil {
			return pool, nil
		}

		slog.Warn("db ping failed, retrying", "attempt", attempt, "error", pingErr)

		if attempt == maxPingAttempts {
			break
		}

		select {
		case <-time.After(pingRetryDelay):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	return nil, fmt.Errorf("pinging db after %d attempts: %w", maxPingAttempts, pingErr)
}
