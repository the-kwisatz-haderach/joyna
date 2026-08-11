package event

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

func (r *Repository) CreateEvent(ctx context.Context, event Event) (Event, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO events (owner_id, name, description, date, location, rsvp_deadline, type, default_spread_allowed)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at, default_spread_allowed`,
		event.OwnerId, event.Name, event.Description, event.Date, event.Location, event.RsvpDeadline, event.Type, event.DefaultSpreadAllowed,
	)

	if err := row.Scan(&event.ID, &event.CreatedAt, &event.DefaultSpreadAllowed); err != nil {
		return Event{}, fmt.Errorf("inserting event: %w", err)
	}

	return event, nil
}
