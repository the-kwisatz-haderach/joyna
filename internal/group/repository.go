package group

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateGroup(ctx context.Context, payload CreateGroupPayload, ownerID string) (Group, error) {
	row, err := r.pool.Query(ctx,
		`INSERT INTO connection_groups (owner_id, name)
		VALUES ($1, $2) RETURNING *`,
		ownerID, payload.Name,
	)
	if err != nil {
		return Group{}, fmt.Errorf("inserting connection group: %w", err)
	}

	group, err := pgx.CollectExactlyOneRow(row, pgx.RowToStructByName[Group])
	if err != nil {
		return Group{}, fmt.Errorf("inserting connection group: %w", err)
	}

	return group, nil
}
