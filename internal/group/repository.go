package group

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateGroup(ctx context.Context, group Group) (Group, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO connection_groups (owner_id, name, is_favorite)
		VALUES ($1, $2, $3) RETURNING id, created_at`,
		group.OwnerID, group.Name, group.IsFavorite,
	)

	if err := row.Scan(&group.ID, &group.CreatedAt); err != nil {
		return Group{}, fmt.Errorf("inserting connection group: %w", err)
	}

	return group, nil
}
