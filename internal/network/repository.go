package network

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

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

const connectionSelect = `
	SELECT
		c.contact_id,
		u.name AS contact_name,
		u.email AS contact_email,
		c.created_at,
		c.is_favorite,
		c.connection_group_id AS group_id,
		g.name AS group_name,
		g.is_favorite AS group_is_favorite,
		COALESCE(events_together.count, 0) AS events_together_count
	FROM %s c
	JOIN users u ON u.id = c.contact_id
	LEFT JOIN connection_groups g ON g.id = c.connection_group_id
	LEFT JOIN LATERAL (
		SELECT COUNT(DISTINCT owner_events.event_id) AS count
		FROM (
			SELECT id AS event_id FROM events WHERE owner_id = c.user_id
			UNION
			SELECT event_id FROM event_invites WHERE invited_user_id = c.user_id AND status <> 'declined'
		) owner_events
		JOIN (
			SELECT id AS event_id FROM events WHERE owner_id = c.contact_id
			UNION
			SELECT event_id FROM event_invites WHERE invited_user_id = c.contact_id AND status <> 'declined'
		) contact_events ON contact_events.event_id = owner_events.event_id
	) events_together ON true
`

func (r *Repository) ListConnections(ctx context.Context, ownerID string) ([]Connection, error) {
	rows, err := r.pool.Query(ctx,
		fmt.Sprintf(connectionSelect, "connections")+`WHERE c.user_id = $1 ORDER BY u.name ASC`,
		ownerID,
	)
	defer rows.Close()
	if err != nil {
		return nil, fmt.Errorf("listing connections: %w", err)
	}

	connections, err := pgx.CollectRows(rows, pgx.RowToStructByName[Connection])
	if err != nil {
		return nil, fmt.Errorf("listing connections: %w", err)
	}
	if connections == nil {
		connections = []Connection{}
	}
	return connections, nil
}

func (r *Repository) ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error) {
	rows, err := r.pool.Query(ctx,
		`WITH my_events AS (
			SELECT id AS event_id FROM events WHERE owner_id = $1
			UNION
			SELECT event_id FROM event_invites WHERE invited_user_id = $1 AND status <> 'declined'
		),
		attendees AS (
			SELECT owner_id AS user_id, id AS event_id FROM events
			UNION
			SELECT invited_user_id AS user_id, event_id FROM event_invites WHERE status <> 'declined'
		)
		SELECT u.id AS user_id, u.name, u.email, COUNT(DISTINCT a.event_id) AS shared_event_count
		FROM attendees a
		JOIN my_events me ON me.event_id = a.event_id
		JOIN users u ON u.id = a.user_id
		WHERE a.user_id <> $1
		AND NOT EXISTS (
			SELECT 1 FROM connections c WHERE c.user_id = $1 AND c.contact_id = a.user_id
		)
		GROUP BY u.id, u.name, u.email
		ORDER BY shared_event_count DESC, u.name ASC`,
		ownerID,
	)
	defer rows.Close()
	if err != nil {
		return nil, fmt.Errorf("listing potential connections: %w", err)
	}

	potential, err := pgx.CollectRows(rows, pgx.RowToStructByName[PotentialConnection])
	if err != nil {
		return nil, fmt.Errorf("listing potential connections: %w", err)
	}
	if potential == nil {
		potential = []PotentialConnection{}
	}
	return potential, nil
}

// FindUserByEmail looks up any registered user by an exact, case-sensitive
// email match — used by the "add by email" flow, which needs to search the
// whole user directory rather than just the caller's existing connections.
func (r *Repository) FindUserByEmail(ctx context.Context, email string) (EmailLookupResult, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id AS user_id, name, email FROM users WHERE email = $1`,
		email,
	)

	var result EmailLookupResult
	if err := row.Scan(&result.UserID, &result.Name, &result.Email); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EmailLookupResult{}, ErrUserNotFound
		}
		return EmailLookupResult{}, fmt.Errorf("finding user by email: %w", err)
	}
	return result, nil
}

func (r *Repository) CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
	rows, err := r.pool.Query(ctx,
		`WITH ins AS (
			INSERT INTO connections (user_id, contact_id, connection_group_id)
			VALUES ($1, $2, $3)
			RETURNING *
		)`+fmt.Sprintf(connectionSelect, "ins"),
		ownerID, payload.ContactID, payload.GroupID,
	)
	defer rows.Close()
	if err != nil {
		return Connection{}, fmt.Errorf("inserting connection: %w", err)
	}

	created, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Connection])
	if err != nil {
		return Connection{}, GetSentinelError(err, fmt.Errorf("inserting connection: %w", err))
	}
	return created, nil
}

func (r *Repository) UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
	// $3/$4 are split (rather than overloading a single placeholder with both
	// ::text and ::uuid casts) because Postgres requires every occurrence of
	// the same placeholder to resolve to one consistent type.
	clearGroup := payload.GroupID != nil && *payload.GroupID == ""
	var newGroupID *string
	if payload.GroupID != nil && *payload.GroupID != "" {
		newGroupID = payload.GroupID
	}

	rows, err := r.pool.Query(ctx,
		`WITH upd AS (
			UPDATE connections SET
				connection_group_id = CASE
					WHEN $3 THEN NULL
					ELSE COALESCE($4::uuid, connection_group_id)
				END,
				is_favorite = COALESCE($5, is_favorite)
			WHERE user_id = $1 AND contact_id = $2
			RETURNING *
		)`+fmt.Sprintf(connectionSelect, "upd"),
		ownerID, contactID, clearGroup, newGroupID, payload.IsFavorite,
	)
	defer rows.Close()
	if err != nil {
		return Connection{}, fmt.Errorf("updating connection: %w", err)
	}

	updated, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Connection])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Connection{}, ErrConnectionNotFound
		}
		return Connection{}, GetSentinelError(err, fmt.Errorf("updating connection: %w", err))
	}
	return updated, nil
}

func (r *Repository) DeleteConnection(ctx context.Context, contactID, ownerID string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM connections WHERE user_id = $1 AND contact_id = $2`,
		ownerID, contactID,
	)
	if err != nil {
		return fmt.Errorf("deleting connection: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrConnectionNotFound
	}
	return nil
}

// CreateOrRefreshInvite creates a pending invite, or — if the inviter
// already has one pending for this email (the partial unique index on
// (inviter_id, invited_email) WHERE accepted_at IS NULL) — bumps its
// created_at and returns the existing row instead of erroring, so
// re-clicking "Invite to Joyna" resends rather than duplicating.
func (r *Repository) CreateOrRefreshInvite(ctx context.Context, inviterID, email string) (NetworkInvite, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO network_invites (inviter_id, invited_email)
		VALUES ($1, $2)
		ON CONFLICT (inviter_id, invited_email) WHERE accepted_at IS NULL
		DO UPDATE SET created_at = NOW()
		RETURNING *`,
		inviterID, email,
	)
	defer rows.Close()
	if err != nil {
		return NetworkInvite{}, fmt.Errorf("inserting network invite: %w", err)
	}

	invite, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[NetworkInvite])
	if err != nil {
		return NetworkInvite{}, GetSentinelError(err, fmt.Errorf("inserting network invite: %w", err))
	}
	return invite, nil
}

// ListPendingInvitesByEmail returns every not-yet-accepted invite raised
// for email, possibly from more than one inviter.
func (r *Repository) ListPendingInvitesByEmail(ctx context.Context, email string) ([]NetworkInvite, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM network_invites WHERE invited_email = $1 AND accepted_at IS NULL`,
		email,
	)
	defer rows.Close()
	if err != nil {
		return nil, fmt.Errorf("listing pending network invites: %w", err)
	}

	invites, err := pgx.CollectRows(rows, pgx.RowToStructByName[NetworkInvite])
	if err != nil {
		return nil, fmt.Errorf("listing pending network invites: %w", err)
	}
	if invites == nil {
		invites = []NetworkInvite{}
	}
	return invites, nil
}

func (r *Repository) MarkInviteAccepted(ctx context.Context, inviteID string) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE network_invites SET accepted_at = NOW() WHERE id = $1`,
		inviteID,
	)
	if err != nil {
		return fmt.Errorf("marking network invite accepted: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrInviteNotFound
	}
	return nil
}

// CreateMutualConnection connects userA and userB in one transaction by
// inserting both directional connections rows (the table only models one
// direction per row). ON CONFLICT DO NOTHING makes this safe to call even
// if one direction already exists some other way.
func (r *Repository) CreateMutualConnection(ctx context.Context, userA, userB string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	const insertDirection = `
		INSERT INTO connections (user_id, contact_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, contact_id) DO NOTHING`

	if _, err := tx.Exec(ctx, insertDirection, userA, userB); err != nil {
		return fmt.Errorf("inserting connection %s -> %s: %w", userA, userB, err)
	}
	if _, err := tx.Exec(ctx, insertDirection, userB, userA); err != nil {
		return fmt.Errorf("inserting connection %s -> %s: %w", userB, userA, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing tx: %w", err)
	}
	return nil
}
