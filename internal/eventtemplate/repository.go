package eventtemplate

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

func (r *Repository) ListTemplates(ctx context.Context, ownerID string) ([]EventTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT * FROM event_templates WHERE owner_id = $1 ORDER BY created_at ASC`,
		ownerID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing event templates: %w", err)
	}
	defer rows.Close()

	templates, err := pgx.CollectRows(rows, pgx.RowToStructByName[EventTemplate])
	if err != nil {
		return nil, fmt.Errorf("listing event templates: %w", err)
	}
	if templates == nil {
		templates = []EventTemplate{}
	}
	return templates, nil
}

func (r *Repository) CreateTemplate(ctx context.Context, payload CreateEventTemplatePayload, ownerID string) (EventTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`INSERT INTO event_templates (owner_id, name, icon, title, date_option, time_of_day, location, rsvp_deadline_option, mood, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
		ownerID, payload.Name, payload.Icon, payload.Title, payload.DateOption, payload.TimeOfDay, payload.Location, payload.RsvpDeadlineOption, payload.Mood, payload.Description,
	)
	if err != nil {
		return EventTemplate{}, fmt.Errorf("inserting event template: %w", err)
	}
	defer rows.Close()

	template, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventTemplate])
	if err != nil {
		return EventTemplate{}, GetSentinelError(err, fmt.Errorf("inserting event template: %w", err))
	}

	return template, nil
}

func (r *Repository) UpdateTemplate(ctx context.Context, templateUpdate UpdateEventTemplatePayload, templateID, ownerID string) (EventTemplate, error) {
	rows, err := r.pool.Query(ctx,
		`UPDATE event_templates SET
			name = COALESCE($3, name),
			icon = COALESCE($4, icon),
			title = COALESCE($5, title),
			date_option = COALESCE($6, date_option),
			time_of_day = CASE WHEN $9 THEN NULL ELSE COALESCE($7, time_of_day) END,
			location = COALESCE($8, location),
			rsvp_deadline_option = COALESCE($10, rsvp_deadline_option),
			mood = CASE WHEN $11 THEN NULL ELSE COALESCE($12, mood) END,
			description = COALESCE($13, description)
		WHERE id = $1 AND owner_id = $2
		RETURNING *`,
		templateID, ownerID,
		templateUpdate.Name, templateUpdate.Icon, templateUpdate.Title, templateUpdate.DateOption,
		templateUpdate.TimeOfDay, templateUpdate.Location, templateUpdate.ClearTimeOfDay,
		templateUpdate.RsvpDeadlineOption,
		templateUpdate.ClearMood, templateUpdate.Mood,
		templateUpdate.Description,
	)
	if err != nil {
		return EventTemplate{}, fmt.Errorf("updating event template: %w", err)
	}
	defer rows.Close()

	template, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[EventTemplate])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return EventTemplate{}, ErrTemplateNotFound
		}
		return EventTemplate{}, GetSentinelError(err, fmt.Errorf("updating event template: %w", err))
	}
	return template, nil
}

func (r *Repository) DeleteTemplate(ctx context.Context, templateID, ownerID string) error {
	cmd, err := r.pool.Exec(ctx,
		`DELETE FROM event_templates WHERE id = $1 AND owner_id = $2`, templateID, ownerID,
	)
	if err != nil {
		return fmt.Errorf("deleting event template: %w", err)
	} else if cmd.RowsAffected() == 0 {
		return ErrTemplateNotFound
	}
	return nil
}

// SeedDefaultTemplates gives a newly registered user a starter set of
// templates so the "New event" screen isn't empty on first login.
func (r *Repository) SeedDefaultTemplates(ctx context.Context, ownerID string) error {
	for _, payload := range DefaultTemplates() {
		if _, err := r.CreateTemplate(ctx, payload, ownerID); err != nil {
			return fmt.Errorf("seeding default template %q: %w", payload.Name, err)
		}
	}
	return nil
}
