package auth

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSanitize(t *testing.T) {
	payload := RegisterUserPayload{Name: " with spaces  ", Email: " TeST@TEST.cOM", Password: "   . "}
	payload.Sanitize()
	require.Equal(t, RegisterUserPayload{
		Name:     "with spaces",
		Email:    "test@test.com",
		Password: ".",
	}, payload)
}

func TestSanitize_TrimsAddress(t *testing.T) {
	address := "  123 Main St  "
	payload := RegisterUserPayload{Name: "name", Email: "test@test.com", Password: "pass", Address: &address}
	payload.Sanitize()
	require.Equal(t, "123 Main St", *payload.Address)
}

func TestSanitize_BlankAddressBecomesNil(t *testing.T) {
	address := "   "
	payload := RegisterUserPayload{Name: "name", Email: "test@test.com", Password: "pass", Address: &address}
	payload.Sanitize()
	require.Nil(t, payload.Address)
}

func TestValidate_EmptyName(t *testing.T) {
	payload := RegisterUserPayload{Name: "", Email: "test@test.com", Password: "test"}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrEmptyName)
}

func TestValidate_EmptyEmail(t *testing.T) {
	payload := RegisterUserPayload{Name: "test", Email: "", Password: "test"}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrEmptyEmail)
}

func TestValidate_EmptyPassword(t *testing.T) {
	payload := RegisterUserPayload{Name: "test", Email: "test@test.com", Password: ""}
	err := payload.Validate()
	require.ErrorIs(t, err, ErrEmptyPassword)
}
