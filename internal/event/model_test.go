package event

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestUpdateEventPayload_Validate_Valid(t *testing.T) {
	payload := UpdateEventPayload{}
	err := payload.Validate()
	require.NoError(t, err)
}

func TestUpdateEventPayload_Validate_InvalidSpread(t *testing.T) {
	var defaultSpreadAllowed = -1
	payload := UpdateEventPayload{
		DefaultSpreadAllowed: &defaultSpreadAllowed,
	}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrNegativeSpread)
}

func TestCreateEventInvitePayload_Validate_InvalidEventId(t *testing.T) {
	payload := CreateEventInvitePayload{
		EventID: "12345",
	}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrInvalidEventId)
}

func TestCreateEventInvitePayload_Validate_InvalidUserId(t *testing.T) {
	validId := uuid.New().String()
	payload := CreateEventInvitePayload{
		EventID:       validId,
		InvitedUserID: validId,
		SpreadAllowed: -1,
	}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrNegativeSpread)
}
