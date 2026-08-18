package group

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCreateGroupPayload_Sanitize(t *testing.T) {
	payload := CreateGroupPayload{Name: " with spaces  "}
	payload.Sanitize()
	require.Equal(t, CreateGroupPayload{Name: "with spaces"}, payload)
}

func TestCreateGroupPayload_Validate_Valid(t *testing.T) {
	payload := CreateGroupPayload{Name: "friends"}
	err := payload.Validate()
	require.NoError(t, err)
}

func TestCreateGroupPayload_Validate_EmptyName(t *testing.T) {
	payload := CreateGroupPayload{Name: ""}
	err := payload.Validate()
	require.Error(t, err)
}

func TestUpdateGroupPayload_Sanitize(t *testing.T) {
	name := " with spaces  "
	payload := UpdateGroupPayload{Name: &name}
	payload.Sanitize()
	require.Equal(t, "with spaces", *payload.Name)
}

func TestUpdateGroupPayload_Sanitize_NilName(t *testing.T) {
	payload := UpdateGroupPayload{}
	payload.Sanitize()
	require.Nil(t, payload.Name)
}

func TestUpdateGroupPayload_Validate_Valid(t *testing.T) {
	payload := UpdateGroupPayload{}
	err := payload.Validate()
	require.NoError(t, err)
}

func TestUpdateGroupPayload_Validate_EmptyName(t *testing.T) {
	name := "   "
	payload := UpdateGroupPayload{Name: &name}
	err := payload.Validate()
	require.Error(t, err)
}

func TestUpdateGroupPayload_Validate_NonEmptyName(t *testing.T) {
	name := "new name"
	payload := UpdateGroupPayload{Name: &name}
	err := payload.Validate()
	require.NoError(t, err)
}
