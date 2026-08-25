package network

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestCreateConnectionPayload_Validate_Valid(t *testing.T) {
	payload := CreateConnectionPayload{ContactID: uuid.NewString()}
	require.NoError(t, payload.Validate())
}

func TestCreateConnectionPayload_Validate_InvalidContactID(t *testing.T) {
	payload := CreateConnectionPayload{ContactID: "not-a-uuid"}
	require.ErrorIs(t, payload.Validate(), ErrInvalidContactID)
}

func TestCreateConnectionPayload_Validate_InvalidGroupID(t *testing.T) {
	groupID := "not-a-uuid"
	payload := CreateConnectionPayload{ContactID: uuid.NewString(), GroupID: &groupID}
	require.ErrorIs(t, payload.Validate(), ErrInvalidGroupID)
}

func TestUpdateConnectionPayload_Validate_Nil(t *testing.T) {
	payload := UpdateConnectionPayload{}
	require.NoError(t, payload.Validate())
}

func TestUpdateConnectionPayload_Validate_EmptyGroupIDClearsGroup(t *testing.T) {
	empty := ""
	payload := UpdateConnectionPayload{GroupID: &empty}
	require.NoError(t, payload.Validate())
}

func TestUpdateConnectionPayload_Validate_InvalidGroupID(t *testing.T) {
	groupID := "not-a-uuid"
	payload := UpdateConnectionPayload{GroupID: &groupID}
	require.ErrorIs(t, payload.Validate(), ErrInvalidGroupID)
}
