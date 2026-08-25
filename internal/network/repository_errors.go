package network

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrConnectionNotFound      = errors.New("connection not found")
	ErrConnectionAlreadyExists = errors.New("connection already exists")
	ErrContactNotFound         = errors.New("contact not found")
	ErrGroupNotFound           = errors.New("connection group not found")
)

const (
	pgUniqueViolation     = "23505"
	pgForeignKeyViolation = "23503"
)

func GetSentinelError(err error, fallback error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch {
		case pgErr.Code == pgUniqueViolation && pgErr.ConstraintName == "connections_pkey":
			return ErrConnectionAlreadyExists
		case pgErr.Code == pgForeignKeyViolation && pgErr.ConstraintName == "connections_contact_id_fkey":
			return ErrContactNotFound
		case pgErr.Code == pgForeignKeyViolation && pgErr.ConstraintName == "connections_connection_group_id_fkey":
			return ErrGroupNotFound
		}
	}
	return fallback
}
