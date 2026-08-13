package group

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

var ErrGroupNotFound = errors.New("group not found")

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) UpdateGroup(ctx context.Context, groupUpdate GroupUpdate, groupID, ownerID string) (Group, error) {
	rows, err := r.pool.Query(ctx,
		`UPDATE connection_groups SET
			name = COALESCE($3, name),
			is_favorite = COALESCE($4, is_favorite)
		WHERE id = $1 AND owner_id = $2
		RETURNING *`,
		groupID, ownerID, groupUpdate.Name, groupUpdate.IsFavorite,
	)
	defer rows.Close()
	if err != nil {
		return Group{}, fmt.Errorf("updating group: %w", err)
	}

	group, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Group])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Group{}, ErrGroupNotFound
		}
		return Group{}, fmt.Errorf("updating group: %w", err)
	}

	return group, nil
}
