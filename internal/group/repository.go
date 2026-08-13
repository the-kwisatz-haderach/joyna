package group

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

var ErrGroupNotFound = errors.New("group not found")

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) DeleteGroup(ctx context.Context, groupID, ownerID string) error {
	cmd, err := r.pool.Exec(ctx,
		`DELETE FROM connection_groups WHERE id = $1 AND owner_id = $2`, groupID, ownerID,
	)
	if err != nil {
		return fmt.Errorf("deleting group: %w", err)
	} else if cmd.RowsAffected() == 0 {
		return ErrGroupNotFound
	}
	return nil
}
