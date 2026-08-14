package event

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrEventNotFound       = errors.New("event not found")
	ErrEventOwnerNotFound  = errors.New("owner not found")
	ErrMultipleEventsFound = errors.New("expected single event for query, got multiple")
	ErrAlreadyInvited      = errors.New("user has already been invited")
	ErrInvalidEventType    = errors.New("invalid event type supplied")
	ErrInvitedUserNotFound = errors.New("invited user not found")
)

const pgUniqueViolation = "23505"
const pgForeignKeyViolation = "23503"

func GetSentinelError(err error, fallback error) error {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		switch {
		case pgError.Code == pgForeignKeyViolation && pgError.ConstraintName == "events_type_fkey":
			return ErrInvalidEventType
		case pgError.Code == pgForeignKeyViolation && pgError.ConstraintName == "events_owner_id_fkey":
			return ErrEventOwnerNotFound
		case pgError.Code == pgUniqueViolation && pgError.ConstraintName == "event_invites_pkey":
			return ErrAlreadyInvited
		case pgError.Code == pgForeignKeyViolation && pgError.ConstraintName == "event_invites_invited_user_id_fkey":
			return ErrInvitedUserNotFound
		}
	}
	return fallback
}
