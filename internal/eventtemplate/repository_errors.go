package eventtemplate

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrTemplateNotFound      = errors.New("event template not found")
	ErrTemplateOwnerNotFound = errors.New("owner not found")
	ErrInvalidMood           = errors.New("invalid mood supplied")
)

const pgForeignKeyViolation = "23503"
const pgCheckViolation = "23514"

func GetSentinelError(err error, fallback error) error {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		switch {
		case pgError.Code == pgCheckViolation && pgError.ConstraintName == "event_templates_mood_check":
			return ErrInvalidMood
		case pgError.Code == pgForeignKeyViolation && pgError.ConstraintName == "event_templates_owner_id_fkey":
			return ErrTemplateOwnerNotFound
		}
	}
	return fallback
}
