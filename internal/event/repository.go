package event

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

var (
	ErrEventNotFound       = errors.New("event not found")
	ErrMultipleEventsFound = errors.New("expected single event for query, got multiple")
)

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

func (r *Repository) DeleteEvent(ctx context.Context, eventID, ownerID string) error {
	cmd, err := r.pool.Exec(ctx,
		`DELETE FROM events WHERE id = $1 AND owner_id = $2`, eventID, ownerID,
	)
	if err != nil {
		return fmt.Errorf("deleting event: %w", err)
	} else if cmd.RowsAffected() == 0 {
		return ErrEventNotFound
	}
	return nil
}

func (r *Repository) UpdateEvent(ctx context.Context, eventUpdate EventUpdate, eventID, ownerID string) (Event, error) {
	var event Event
	rows, err := r.pool.Query(ctx,
		`UPDATE events SET 
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			date = COALESCE($5, date),
			location = COALESCE($6, location),
			rsvp_deadline = COALESCE($7, rsvp_deadline),
			type = COALESCE($8, type),
			default_spread_allowed = COALESCE($9, default_spread_allowed)
		WHERE id = $1 AND owner_id = $2
		RETURNING *`,
		eventID, ownerID, eventUpdate.Name, eventUpdate.Description, eventUpdate.Date, eventUpdate.Location, eventUpdate.RsvpDeadline, eventUpdate.Type, eventUpdate.DefaultSpreadAllowed,
	)
	if err != nil {
		return Event{}, fmt.Errorf("updating event: %w", err)
	}
	event, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if errors.Is(err, pgx.ErrNoRows) {
		return Event{}, ErrEventNotFound
	}
	if errors.Is(err, pgx.ErrTooManyRows) {
		return Event{}, ErrMultipleEventsFound
	}
	return event, nil
}
