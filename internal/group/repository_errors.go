package group

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrGroupNotFound  = errors.New("group not found")
	ErrGroupNameTaken = errors.New("group with this name already exists")
)

const pgUniqueViolation = "23505"

func GetSentinelError(err error, fallback error) error {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		switch {
		case pgError.Code == pgUniqueViolation && pgError.ConstraintName == "connection_groups_name_owner_id_key":
			return ErrGroupNameTaken
		}
	}
	return fallback
}
