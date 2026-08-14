package event

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

var (
	ErrEventNotFound       = errors.New("event not found")
	ErrMultipleEventsFound = errors.New("expected single event for query, got multiple")
	ErrAlreadyInvited      = errors.New("user has already been invited")
)

const pgUniqueViolation = "23505"

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
	defer rows.Close()
	if err != nil {
		return Event{}, fmt.Errorf("updating event: %w", err)
	}
	event, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Event{}, ErrEventNotFound
		}
		if errors.Is(err, pgx.ErrTooManyRows) {
			return Event{}, ErrMultipleEventsFound
		}
		return Event{}, fmt.Errorf("updating event: %w", err)
	}
	return event, nil
}

func (r *Repository) GetEvent(ctx context.Context, eventID string) (Event, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM events WHERE id = $1`,
		eventID,
	)
	defer rows.Close()
	if err != nil {
		return Event{}, fmt.Errorf("getting event: %w", err)
	}

	event, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Event{}, ErrEventNotFound
		}
		return Event{}, fmt.Errorf("getting event: %w", err)
	}

	return event, nil
}

func (r *Repository) GetEventsByOwner(ctx context.Context, ownerID string, sortField EventSortField, order SortOrder) ([]Event, error) {
	column := "date"
	if sortField == EventSortFieldCreatedAt {
		column = "created_at"
	}
	direction := "ASC"
	if order == SortOrderDesc {
		direction = "DESC"
	}

	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`SELECT * FROM events WHERE owner_id = $1 ORDER BY %s %s`, column, direction),
		ownerID,
	)
	defer rows.Close()
	if err != nil {
		return []Event{}, fmt.Errorf("listing events query: %w", err)
	}

	events, err := pgx.CollectRows(rows, pgx.RowToStructByName[Event])
	if err != nil {
		return []Event{}, fmt.Errorf("listing events: %w", err)
	}
	if events == nil {
		events = []Event{}
	}

	return events, nil
}

func (r *Repository) CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO event_invites (invited_by, event_id, invited_user_id, spread_allowed) VALUES ($1, $2, $3, $4) RETURNING *`,
		invitedBy, payload.EventID, payload.InvitedUserID, payload.SpreadAllowed,
	)
	defer rows.Close()

	if err != nil {
		return EventInvite{}, fmt.Errorf("insert event_invite: %w", err)
	}

	created, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return EventInvite{}, ErrAlreadyInvited
		}
		return EventInvite{}, fmt.Errorf("insert event_invite: %w", err)
	}

	return created, nil
}

func (r *Repository) ForwardEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return EventInvite{}, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx,
		`SELECT * FROM event_invites WHERE event_id = $1 AND invited_user_id = $2 FOR UPDATE`,
		payload.EventID, invitedBy,
	)
	if err != nil {
		return EventInvite{}, fmt.Errorf("locking sender invite: %w", err)
	}
	senderInvite, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventInvite])
	rows.Close()
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventInvite{}, ErrInviteNotAllowed
		}
		return EventInvite{}, fmt.Errorf("locking sender invite: %w", err)
	}

	var sentCount int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM event_invites WHERE event_id = $1 AND invited_by = $2`,
		payload.EventID, invitedBy,
	).Scan(&sentCount); err != nil {
		return EventInvite{}, fmt.Errorf("counting sent invites: %w", err)
	}

	if senderInvite.Status != InviteStateAccepted || sentCount >= senderInvite.SpreadAllowed {
		return EventInvite{}, ErrInviteNotAllowed
	}

	insertRows, err := tx.Query(ctx,
		`INSERT INTO event_invites (invited_by, event_id, invited_user_id, spread_allowed) VALUES ($1, $2, $3, $4) RETURNING *`,
		invitedBy, payload.EventID, payload.InvitedUserID, payload.SpreadAllowed,
	)
	if err != nil {
		return EventInvite{}, fmt.Errorf("insert event_invite: %w", err)
	}
	created, err := pgx.CollectExactlyOneRow(insertRows, pgx.RowToStructByName[EventInvite])
	insertRows.Close()
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return EventInvite{}, ErrAlreadyInvited
		}
		return EventInvite{}, fmt.Errorf("insert event_invite: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return EventInvite{}, fmt.Errorf("committing tx: %w", err)
	}

	return created, nil
}
