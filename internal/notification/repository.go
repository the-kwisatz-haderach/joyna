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
