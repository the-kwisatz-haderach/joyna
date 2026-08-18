package auth

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type fakeRepository struct {
	createUserFunc     func(ctx context.Context, name, email, passwordHash string) (User, error)
	getUserByEmailFunc func(ctx context.Context, email string) (User, string, error)
}

func (f *fakeRepository) CreateUser(ctx context.Context, name, email, passwordHash string) (User, error) {
	return f.createUserFunc(ctx, name, email, passwordHash)
}

func (f *fakeRepository) GetUserByEmail(ctx context.Context, email string) (User, string, error) {
	return f.getUserByEmailFunc(ctx, email)
}

func TestRegister(t *testing.T) {
	createdUser := User{
		Name:  "hello",
		Email: "world",
	}
	var repo = &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string) (User, error) {
			return createdUser, nil
		},
	}
	service := NewService(repo)
	user, err := service.Register(context.Background(), "name", "email", "pass")
	require.NoError(t, err)
	require.Equal(t, createdUser, user)
}

func TestAuthenticate_Valid(t *testing.T) {
	password := "secret_sauce"
	correctHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	storedUser := User{
		Name:  "hello",
		Email: "world",
	}
	var repo = &fakeRepository{
		getUserByEmailFunc: func(ctx context.Context, email string) (User, string, error) {
			return storedUser, string(correctHash), nil
		},
	}
	service := NewService(repo)
	user, err := service.Authenticate(context.Background(), "email", password)
	require.NoError(t, err)
	require.Equal(t, storedUser, user)
}

func TestAuthenticate_InvalidPassword(t *testing.T) {
	password := "secret_sauce"
	correctHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	storedUser := User{
		Name:  "hello",
		Email: "world",
	}
	var repo = &fakeRepository{
		getUserByEmailFunc: func(ctx context.Context, email string) (User, string, error) {
			return storedUser, string(correctHash), nil
		},
	}
	service := NewService(repo)
	user, err := service.Authenticate(context.Background(), "email", "invalid_pass")
	require.ErrorIs(t, err, ErrInvalidCredentials)
	require.Equal(t, User{}, user)
}

func TestAuthenticate_UserNotFound(t *testing.T) {
	password := "secret_sauce"
	correctHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	var repo = &fakeRepository{
		getUserByEmailFunc: func(ctx context.Context, email string) (User, string, error) {
			return User{}, string(correctHash), ErrUserNotFound
		},
	}
	service := NewService(repo)
	_, err = service.Authenticate(context.Background(), "email", password)
	require.ErrorIs(t, err, ErrInvalidCredentials)
}
