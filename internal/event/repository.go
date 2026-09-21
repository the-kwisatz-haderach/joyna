package event

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateEvent(ctx context.Context, payload CreateEventPayload, ownerID string) (Event, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO events (owner_id, name, description, date, location, rsvp_deadline, type, default_spread_allowed, mood)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
		ownerID, payload.Name, payload.Description, payload.Date, payload.Location, payload.RsvpDeadline, payload.Type, payload.DefaultSpreadAllowed, payload.Mood,
	)
	if err != nil {
		return Event{}, fmt.Errorf("inserting event: %w", err)
	}
	defer rows.Close()

	event, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if err != nil {
		sentinelErr := GetSentinelError(err, fmt.Errorf("inserting event: %w", err))
		return Event{}, sentinelErr
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

func (r *Repository) UpdateEvent(ctx context.Context, eventUpdate UpdateEventPayload, eventID, ownerID string) (Event, error) {
	var event Event
	rows, err := r.pool.Query(ctx,
		`UPDATE events SET
			name = COALESCE($3, name),
			description = COALESCE($4, description),
			date = COALESCE($5, date),
			location = COALESCE($6, location),
			rsvp_deadline = COALESCE($7, rsvp_deadline),
			type = COALESCE($8, type),
			default_spread_allowed = COALESCE($9, default_spread_allowed),
			mood = COALESCE($10, mood)
		WHERE id = $1 AND owner_id = $2
		RETURNING *`,
		eventID, ownerID, eventUpdate.Name, eventUpdate.Description, eventUpdate.Date, eventUpdate.Location, eventUpdate.RsvpDeadline, eventUpdate.Type, eventUpdate.DefaultSpreadAllowed, eventUpdate.Mood,
	)
	if err != nil {
		return Event{}, fmt.Errorf("updating event: %w", err)
	}
	defer rows.Close()
	event, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Event{}, ErrEventNotFound
		}
		if errors.Is(err, pgx.ErrTooManyRows) {
			return Event{}, ErrMultipleEventsFound
		}
		err := GetSentinelError(err, fmt.Errorf("updating event: %w", err))
		return Event{}, err
	}
	return event, nil
}

func (r *Repository) GetEvent(ctx context.Context, eventID string) (Event, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM events WHERE id = $1`,
		eventID,
	)
	if err != nil {
		return Event{}, fmt.Errorf("getting event: %w", err)
	}
	defer rows.Close()

	event, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Event])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Event{}, ErrEventNotFound
		}
		return Event{}, fmt.Errorf("getting event: %w", err)
	}

	return event, nil
}

// GetEventsByOwner lists events in scope, enriched per-event with whether
// the viewer owns it and (if not) their invite status — the events listing
// UI uses both to power its Hosting/Invited filters and host/accepted
// badges without an N+1 lookup per event.
func (r *Repository) GetEventsByOwner(ctx context.Context, userID string, sortField EventSortField, order SortOrder, scope EventListScope) ([]EventView, error) {
	column := "date"
	if sortField == EventSortFieldCreatedAt {
		column = "created_at"
	}
	direction := "ASC"
	if order == SortOrderDesc {
		direction = "DESC"
	}

	const invitedClause = `EXISTS (SELECT 1 FROM event_invites WHERE event_id = events.id AND invited_user_id = $1)`
	where := "owner_id = $1"
	switch scope {
	case EventListScopeInvited:
		where = invitedClause
	case EventListScopeAll:
		where = "owner_id = $1 OR " + invitedClause
	}

	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(`SELECT * FROM events WHERE %s ORDER BY %s %s`, where, column, direction),
		userID,
	)
	if err != nil {
		return []EventView{}, fmt.Errorf("listing events query: %w", err)
	}
	events, err := pgx.CollectRows(rows, pgx.RowToStructByName[Event])
	rows.Close()
	if err != nil {
		return []EventView{}, fmt.Errorf("listing events: %w", err)
	}

	inviteRows, err := r.pool.Query(ctx,
		`SELECT * FROM event_invites WHERE invited_user_id = $1`,
		userID,
	)
	if err != nil {
		return []EventView{}, fmt.Errorf("listing viewer invites: %w", err)
	}
	invites, err := pgx.CollectRows(inviteRows, pgx.RowToStructByName[EventInvite])
	inviteRows.Close()
	if err != nil {
		return []EventView{}, fmt.Errorf("listing viewer invites: %w", err)
	}
	statusByEventID := make(map[string]EventInviteStatus, len(invites))
	for _, invite := range invites {
		statusByEventID[invite.EventID] = invite.Status
	}

	views := make([]EventView, len(events))
	for i, ev := range events {
		views[i] = EventView{Event: ev, IsOwner: ev.OwnerId == userID}
		if status, ok := statusByEventID[ev.ID]; ok {
			views[i].ViewerInviteStatus = &status
		}
	}

	return views, nil
}

func (r *Repository) GetEventInvite(ctx context.Context, eventID, userID string) (EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM event_invites WHERE event_id = $1 AND invited_user_id = $2`,
		eventID, userID,
	)
	if err != nil {
		return EventInvite{}, fmt.Errorf("getting event invite: %w", err)
	}
	defer rows.Close()

	invite, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventInvite{}, ErrInviteNotFound
		}
		return EventInvite{}, fmt.Errorf("getting event invite: %w", err)
	}

	return invite, nil
}

func (r *Repository) RespondToEventInvite(ctx context.Context, eventID, userID string, status EventInviteStatus) (EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`UPDATE event_invites SET status = $3 WHERE event_id = $1 AND invited_user_id = $2 RETURNING *`,
		eventID, userID, status,
	)
	if err != nil {
		return EventInvite{}, fmt.Errorf("responding to event invite: %w", err)
	}
	defer rows.Close()

	invite, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventInvite{}, ErrInviteNotFound
		}
		return EventInvite{}, fmt.Errorf("responding to event invite: %w", err)
	}

	return invite, nil
}

func (r *Repository) ListEventAttendees(ctx context.Context, eventID string) ([]Attendee, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT u.id AS user_id, u.name, u.email, TRUE AS is_owner, ''::TEXT AS status, ''::TEXT AS invited_by
		FROM events e
		JOIN users u ON u.id = e.owner_id
		WHERE e.id = $1
		UNION
		SELECT u.id AS user_id, u.name, u.email, FALSE AS is_owner, ei.status, ei.invited_by::TEXT AS invited_by
		FROM event_invites ei
		JOIN users u ON u.id = ei.invited_user_id
		WHERE ei.event_id = $1
		ORDER BY is_owner DESC, name ASC`,
		eventID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing event attendees: %w", err)
	}
	defer rows.Close()

	attendees, err := pgx.CollectRows(rows, pgx.RowToStructByName[Attendee])
	if err != nil {
		return nil, fmt.Errorf("listing event attendees: %w", err)
	}
	if attendees == nil {
		attendees = []Attendee{}
	}

	return attendees, nil
}

func (r *Repository) DeleteEventInvite(ctx context.Context, eventID, userID string) error {
	cmd, err := r.pool.Exec(ctx,
		`DELETE FROM event_invites WHERE event_id = $1 AND invited_user_id = $2`, eventID, userID,
	)
	if err != nil {
		return fmt.Errorf("deleting event invite: %w", err)
	} else if cmd.RowsAffected() == 0 {
		return ErrInviteNotFound
	}
	return nil
}

func (r *Repository) CreateEventInvite(ctx context.Context, payload CreateEventInvitePayload, invitedBy string) (EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO event_invites (invited_by, event_id, invited_user_id, spread_allowed) VALUES ($1, $2, $3, $4) RETURNING *`,
		invitedBy, payload.EventID, payload.InvitedUserID, payload.SpreadAllowed,
	)

	if err != nil {
		return EventInvite{}, fmt.Errorf("insert event_invite: %w", err)
	}
	defer rows.Close()

	created, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		sentinelErr := GetSentinelError(err, fmt.Errorf("inserting event_invite: %w", err))
		return EventInvite{}, sentinelErr
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
		err := GetSentinelError(err, fmt.Errorf("insert event_invite: %w", err))
		return EventInvite{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return EventInvite{}, fmt.Errorf("committing tx: %w", err)
	}

	return created, nil
}

// ListPendingInvitesWithUnnotifiedRsvpDeadline returns still-pending invites
// whose event's RSVP deadline falls on deadline's calendar date, excluding
// any invite whose invitee has already received a notificationType
// notification for that event — so a daily scheduler calling this more than
// once (or on a restart) never double-notifies.
func (r *Repository) ListPendingInvitesWithUnnotifiedRsvpDeadline(ctx context.Context, deadline time.Time, notificationType string) ([]EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT ei.* FROM event_invites ei
		JOIN events e ON e.id = ei.event_id
		WHERE ei.status = 'pending'
		AND e.rsvp_deadline::date = $1::date
		AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.user_id = ei.invited_user_id
			AND n.type = $2
			AND n.payload ->> 'eventId' = ei.event_id::text
		)`,
		deadline, notificationType,
	)
	if err != nil {
		return nil, fmt.Errorf("listing rsvp deadline invites: %w", err)
	}
	defer rows.Close()

	invites, err := pgx.CollectRows(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		return nil, fmt.Errorf("listing rsvp deadline invites: %w", err)
	}
	return invites, nil
}

// ListAcceptedInvitesForUnnotifiedEventsOn returns accepted invites whose
// event takes place on date's calendar date, excluding any invite whose
// invitee has already received a notificationType notification for that
// event (see ListPendingInvitesWithUnnotifiedRsvpDeadline for why).
func (r *Repository) ListAcceptedInvitesForUnnotifiedEventsOn(ctx context.Context, date time.Time, notificationType string) ([]EventInvite, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT ei.* FROM event_invites ei
		JOIN events e ON e.id = ei.event_id
		WHERE ei.status = 'accepted'
		AND e.date::date = $1::date
		AND NOT EXISTS (
			SELECT 1 FROM notifications n
			WHERE n.user_id = ei.invited_user_id
			AND n.type = $2
			AND n.payload ->> 'eventId' = ei.event_id::text
		)`,
		date, notificationType,
	)
	if err != nil {
		return nil, fmt.Errorf("listing event-today invites: %w", err)
	}
	defer rows.Close()

	invites, err := pgx.CollectRows(rows, pgx.RowToStructByName[EventInvite])
	if err != nil {
		return nil, fmt.Errorf("listing event-today invites: %w", err)
	}
	return invites, nil
}
