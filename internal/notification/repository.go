package notification

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

const listColumns = `
	n.id,
	n.type,
	n.payload ->> 'eventId' AS event_id,
	e.name AS event_name,
	n.payload ->> 'actorId' AS actor_id,
	a.name AS actor_name,
	n.payload ->> 'status' AS status,
	(n.read_at IS NOT NULL) AS is_read,
	n.created_at
`

func (r *Repository) Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)`,
		userID, notifType, payload,
	)
	if err != nil {
		return fmt.Errorf("inserting notification: %w", err)
	}
	return nil
}

// ListByUser returns a page of userID's notifications, most recent first,
// with the referenced event/actor names resolved via a join rather than
// stored redundantly on the row.
func (r *Repository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]Notification, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+listColumns+`
		FROM notifications n
		LEFT JOIN events e ON e.id = NULLIF(n.payload ->> 'eventId', '')::uuid
		LEFT JOIN users a ON a.id = NULLIF(n.payload ->> 'actorId', '')::uuid
		WHERE n.user_id = $1
		ORDER BY n.created_at DESC
		LIMIT $2 OFFSET $3`,
		userID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("listing notifications: %w", err)
	}
	defer rows.Close()

	notifications, err := pgx.CollectRows(rows, pgx.RowToStructByName[Notification])
	if err != nil {
		return nil, fmt.Errorf("listing notifications: %w", err)
	}
	if notifications == nil {
		notifications = []Notification{}
	}

	return notifications, nil
}

// CountByUser returns the total number of userID's notifications, used to
// compute the page count for ListByUser's pagination.
func (r *Repository) CountByUser(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting notifications: %w", err)
	}
	return count, nil
}

func (r *Repository) MarkAllAsRead(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
		userID,
	)
	if err != nil {
		return fmt.Errorf("marking notifications as read: %w", err)
	}
	return nil
}

func (r *Repository) CountUnread(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
		userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting unread notifications: %w", err)
	}
	return count, nil
}

// CreateOrRefreshPushSubscription creates a push subscription, or — if this
// exact endpoint is already subscribed (its own unique constraint) —
// re-points it at userID and refreshes created_at. Endpoints are assigned
// by the browser's push service and are globally unique, so this is what
// makes re-enabling push on the same browser idempotent instead of erroring.
func (r *Repository) CreateOrRefreshPushSubscription(ctx context.Context, userID, endpoint, p256dh, auth string) (PushSubscription, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (endpoint)
		DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, created_at = NOW()
		RETURNING *`,
		userID, endpoint, p256dh, auth,
	)
	if err != nil {
		return PushSubscription{}, fmt.Errorf("inserting push subscription: %w", err)
	}
	defer rows.Close()

	sub, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[PushSubscription])
	if err != nil {
		return PushSubscription{}, fmt.Errorf("inserting push subscription: %w", err)
	}
	return sub, nil
}

func (r *Repository) ListPushSubscriptionsByUser(ctx context.Context, userID string) ([]PushSubscription, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM push_subscriptions WHERE user_id = $1`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing push subscriptions: %w", err)
	}
	defer rows.Close()

	subs, err := pgx.CollectRows(rows, pgx.RowToStructByName[PushSubscription])
	if err != nil {
		return nil, fmt.Errorf("listing push subscriptions: %w", err)
	}
	if subs == nil {
		subs = []PushSubscription{}
	}
	return subs, nil
}

// DeletePushSubscription removes userID's subscription for endpoint — scoped
// to the caller so one user can't unsubscribe another's device.
func (r *Repository) DeletePushSubscription(ctx context.Context, userID, endpoint string) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
		userID, endpoint,
	)
	if err != nil {
		return fmt.Errorf("deleting push subscription: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPushSubscriptionNotFound
	}
	return nil
}

// DeletePushSubscriptionByID removes a single subscription outright,
// regardless of owner — used when the push service itself reports the
// subscription expired, so it's cleaned up no matter who it belonged to.
func (r *Repository) DeletePushSubscriptionByID(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM push_subscriptions WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting push subscription: %w", err)
	}
	return nil
}

// NotificationContext resolves display names for a notification's
// referenced event/actor, used to compose push notification text (the
// in-app feed resolves the same names via ListByUser's JOIN at read time;
// this covers the same need for the fire-and-forget push path). Empty
// eventID/actorID are handled gracefully — NULLIF avoids a uuid cast error
// on "", and a missing/renamed-away row just yields an empty name.
func (r *Repository) NotificationContext(ctx context.Context, eventID, actorID string) (eventName, actorName string, err error) {
	err = r.pool.QueryRow(ctx,
		`SELECT
			COALESCE((SELECT name FROM events WHERE id = NULLIF($1, '')::uuid), ''),
			COALESCE((SELECT name FROM users WHERE id = NULLIF($2, '')::uuid), '')`,
		eventID, actorID,
	).Scan(&eventName, &actorName)
	if err != nil {
		return "", "", fmt.Errorf("resolving notification context: %w", err)
	}
	return eventName, actorName, nil
}
