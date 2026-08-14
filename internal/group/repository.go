package group

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrGroupNotFound  = errors.New("group not found")
	ErrGroupNameTaken = errors.New("group name already in use")
)

const pgUniqueViolation = "23505"

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

func (r *Repository) GetGroup(ctx context.Context, groupID string) (Group, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM connection_groups WHERE id = $1`,
		groupID,
	)
	defer rows.Close()
	if err != nil {
		return Group{}, fmt.Errorf("getting group: %w", err)
	}

	group, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Group])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Group{}, ErrGroupNotFound
		}
		return Group{}, fmt.Errorf("getting group: %w", err)
	}

	return group, nil
}

func (r *Repository) UpdateGroup(ctx context.Context, groupUpdate UpdateGroupPayload, groupID, ownerID string) (Group, error) {
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return Group{}, ErrGroupNameTaken
		}
		return Group{}, fmt.Errorf("updating group: %w", err)
	}

	return group, nil
}
