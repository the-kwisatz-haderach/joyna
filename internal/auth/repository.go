package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrUserNotFound             = errors.New("user not found")
	ErrUserAlreadyExists        = errors.New("user already exists")
	ErrCredentialsAlreadyExists = errors.New("user credentials already exists")
)

const pgUniqueViolation = "23505"

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateUser(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	user := User{Name: name, Email: email, Address: address}

	row := tx.QueryRow(ctx,
		`INSERT INTO users (name, email, address) VALUES ($1, $2, $3) RETURNING id, joined_at`,
		user.Name, user.Email, user.Address,
	)
	if err := row.Scan(&user.Id, &user.JoinedAt); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return User{}, ErrUserAlreadyExists
		}
		return User{}, fmt.Errorf("inserting user: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO credentials (user_id, email, password_hash) VALUES ($1, $2, $3)`,
		user.Id, user.Email, passwordHash,
	); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return User{}, ErrCredentialsAlreadyExists
		}
		return User{}, fmt.Errorf("inserting credentials: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("committing tx: %w", err)
	}

	return user, nil
}

func (r *Repository) UpdateUser(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users SET
			name = COALESCE($2, name),
			address = COALESCE($3, address)
		WHERE id = $1
		RETURNING id, name, email, joined_at, profile_picture_key, address`,
		userID, userUpdate.Name, userUpdate.Address,
	)

	var user User
	if err := row.Scan(&user.Id, &user.Name, &user.Email, &user.JoinedAt, &user.ProfilePictureKey, &user.Address); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, ErrUserNotFound
		}
		return User{}, fmt.Errorf("updating user: %w", err)
	}

	return user, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (User, string, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT u.id, u.name, u.email, u.joined_at, u.profile_picture_key, u.address, c.password_hash
		 FROM credentials c
		 JOIN users u ON u.id = c.user_id
		 WHERE c.email = $1`,
		email,
	)

	var user User
	var passwordHash string
	if err := row.Scan(&user.Id, &user.Name, &user.Email, &user.JoinedAt, &user.ProfilePictureKey, &user.Address, &passwordHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, "", ErrUserNotFound
		}
		return User{}, "", fmt.Errorf("querying user: %w", err)
	}

	return user, passwordHash, nil
}

// DeleteUser soft-deletes a user: the row is kept (anonymized as an "Inactive
// user") so past events and their attendee lists stay intact, while everything
// personal is removed. The email is released so the same address can register
// again from scratch.
func (r *Repository) DeleteUser(ctx context.Context, userID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var email string
	err = tx.QueryRow(ctx,
		`SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, userID,
	).Scan(&email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUserNotFound
		}
		return fmt.Errorf("locking user: %w", err)
	}

	statements := []string{
		`DELETE FROM credentials WHERE user_id = $1`,
		`DELETE FROM connections WHERE user_id = $1 OR contact_id = $1`,
		`DELETE FROM connection_groups WHERE owner_id = $1`,
		`DELETE FROM event_templates WHERE owner_id = $1`,
		`DELETE FROM notifications WHERE user_id = $1`,
		`DELETE FROM push_subscriptions WHERE user_id = $1`,
		`DELETE FROM network_invites WHERE inviter_id = $1`,
		`DELETE FROM events WHERE owner_id = $1 AND date > NOW()`,
		`DELETE FROM event_invites ei USING events e
		 WHERE ei.event_id = e.id AND ei.invited_user_id = $1 AND e.date > NOW()`,
		`DELETE FROM sessions WHERE POSITION(CONVERT_TO($1::text, 'UTF8') IN data) > 0`,
	}
	for _, stmt := range statements {
		if _, err := tx.Exec(ctx, stmt, userID); err != nil {
			return fmt.Errorf("cleaning up user data: %w", err)
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM network_invites WHERE invited_email = $1`, email); err != nil {
		return fmt.Errorf("deleting network invites: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE users SET
			name = 'Inactive user',
			email = 'deleted+' || id::text || '@deleted.invalid',
			profile_picture_key = NULL,
			address = NULL,
			deleted_at = NOW()
		WHERE id = $1`, userID,
	); err != nil {
		return fmt.Errorf("anonymizing user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("committing tx: %w", err)
	}
	return nil
}
