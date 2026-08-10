package auth

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUserNotFound = errors.New("user not found")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateUser(ctx context.Context, name, email, passwordHash string) (User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return User{}, fmt.Errorf("beginning tx: %w", err)
	}
	defer tx.Rollback(ctx)

	user := User{Id: uuid.NewString(), Name: name, Email: email}

	row := tx.QueryRow(ctx,
		`INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING joined_at`,
		user.Id, user.Name, user.Email,
	)
	if err := row.Scan(&user.JoinedAt); err != nil {
		return User{}, fmt.Errorf("inserting user: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO credentials (user_id, email, password_hash) VALUES ($1, $2, $3)`,
		user.Id, user.Email, passwordHash,
	); err != nil {
		return User{}, fmt.Errorf("inserting credentials: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, fmt.Errorf("committing tx: %w", err)
	}

	return user, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (User, string, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT u.id, u.name, u.email, u.joined_at, u.profile_picture_key, c.password_hash
		 FROM credentials c
		 JOIN users u ON u.id = c.user_id
		 WHERE c.email = $1`,
		email,
	)

	var user User
	var passwordHash string
	if err := row.Scan(&user.Id, &user.Name, &user.Email, &user.JoinedAt, &user.ProfilePictureKey, &passwordHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, "", ErrUserNotFound
		}
		return User{}, "", fmt.Errorf("querying user: %w", err)
	}

	return user, passwordHash, nil
}
