package auth

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type fakeRepository struct {
	createUserFunc     func(ctx context.Context, name, email, passwordHash string, address *string) (User, error)
	getUserByEmailFunc func(ctx context.Context, email string) (User, string, error)
	updateUserFunc     func(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error)
}

func (f *fakeRepository) CreateUser(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
	return f.createUserFunc(ctx, name, email, passwordHash, address)
}

func (f *fakeRepository) GetUserByEmail(ctx context.Context, email string) (User, string, error) {
	return f.getUserByEmailFunc(ctx, email)
}

func (f *fakeRepository) UpdateUser(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error) {
	return f.updateUserFunc(ctx, userUpdate, userID)
}

type fakeInviteResolver struct {
	resolvePendingInvitesFunc func(ctx context.Context, userID, email string) error
}

func (f *fakeInviteResolver) ResolvePendingInvites(ctx context.Context, userID, email string) error {
	return f.resolvePendingInvitesFunc(ctx, userID, email)
}

type fakeTemplateSeeder struct {
	seedDefaultTemplatesFunc func(ctx context.Context, ownerID string) error
}

func (f *fakeTemplateSeeder) SeedDefaultTemplates(ctx context.Context, ownerID string) error {
	return f.seedDefaultTemplatesFunc(ctx, ownerID)
}

func TestRegister(t *testing.T) {
	createdUser := User{
		Name:  "hello",
		Email: "world",
	}
	var repo = &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
			return createdUser, nil
		},
	}
	service := NewService(repo, nil, nil)
	user, err := service.Register(context.Background(), "name", "email", "pass", nil)
	require.NoError(t, err)
	require.Equal(t, createdUser, user)
}

func TestRegister_ResolvesPendingInvites(t *testing.T) {
	createdUser := User{Id: "user-1", Name: "hello", Email: "world"}
	var resolveCalled bool
	repo := &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
			return createdUser, nil
		},
	}
	resolver := &fakeInviteResolver{
		resolvePendingInvitesFunc: func(ctx context.Context, userID, email string) error {
			resolveCalled = true
			require.Equal(t, "user-1", userID)
			require.Equal(t, "world", email)
			return nil
		},
	}
	service := NewService(repo, resolver, nil)
	_, err := service.Register(context.Background(), "name", "email", "pass", nil)
	require.NoError(t, err)
	require.True(t, resolveCalled)
}

func TestRegister_SucceedsWhenResolvingPendingInvitesFails(t *testing.T) {
	createdUser := User{Id: "user-1", Name: "hello", Email: "world"}
	repo := &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
			return createdUser, nil
		},
	}
	resolver := &fakeInviteResolver{
		resolvePendingInvitesFunc: func(ctx context.Context, userID, email string) error {
			return errors.New("boom")
		},
	}
	service := NewService(repo, resolver, nil)
	user, err := service.Register(context.Background(), "name", "email", "pass", nil)
	require.NoError(t, err)
	require.Equal(t, createdUser, user)
}

func TestRegister_SeedsDefaultTemplates(t *testing.T) {
	createdUser := User{Id: "user-1", Name: "hello", Email: "world"}
	var seedCalled bool
	repo := &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
			return createdUser, nil
		},
	}
	seeder := &fakeTemplateSeeder{
		seedDefaultTemplatesFunc: func(ctx context.Context, ownerID string) error {
			seedCalled = true
			require.Equal(t, "user-1", ownerID)
			return nil
		},
	}
	service := NewService(repo, nil, seeder)
	_, err := service.Register(context.Background(), "name", "email", "pass", nil)
	require.NoError(t, err)
	require.True(t, seedCalled)
}

func TestRegister_SucceedsWhenSeedingDefaultTemplatesFails(t *testing.T) {
	createdUser := User{Id: "user-1", Name: "hello", Email: "world"}
	repo := &fakeRepository{
		createUserFunc: func(ctx context.Context, name, email, passwordHash string, address *string) (User, error) {
			return createdUser, nil
		},
	}
	seeder := &fakeTemplateSeeder{
		seedDefaultTemplatesFunc: func(ctx context.Context, ownerID string) error {
			return errors.New("boom")
		},
	}
	service := NewService(repo, nil, seeder)
	user, err := service.Register(context.Background(), "name", "email", "pass", nil)
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
	service := NewService(repo, nil, nil)
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
	service := NewService(repo, nil, nil)
	user, err := service.Authenticate(context.Background(), "email", "invalid_pass")
	require.ErrorIs(t, err, ErrInvalidCredentials)
	require.Equal(t, User{}, user)
}

func TestUpdateUser(t *testing.T) {
	updatedUser := User{
		Id:   "user-1",
		Name: "New Name",
	}
	var repo = &fakeRepository{
		updateUserFunc: func(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error) {
			return updatedUser, nil
		},
	}
	service := NewService(repo, nil, nil)
	name := "New Name"
	user, err := service.UpdateUser(context.Background(), UpdateUserPayload{Name: &name}, "user-1")
	require.NoError(t, err)
	require.Equal(t, updatedUser, user)
}

func TestUpdateUser_NotFound(t *testing.T) {
	var repo = &fakeRepository{
		updateUserFunc: func(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error) {
			return User{}, ErrUserNotFound
		},
	}
	service := NewService(repo, nil, nil)
	_, err := service.UpdateUser(context.Background(), UpdateUserPayload{}, "missing-user")
	require.ErrorIs(t, err, ErrUserNotFound)
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
	service := NewService(repo, nil, nil)
	_, err = service.Authenticate(context.Background(), "email", password)
	require.ErrorIs(t, err, ErrInvalidCredentials)
}
