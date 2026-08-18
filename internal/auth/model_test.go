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
