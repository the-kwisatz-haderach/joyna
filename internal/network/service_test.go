package network

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	listConnectionsFunc          func(ctx context.Context, ownerID string) ([]Connection, error)
	listPotentialConnectionsFunc func(ctx context.Context, ownerID string) ([]PotentialConnection, error)
	createConnectionFunc         func(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error)
	updateConnectionFunc         func(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error)
	findUserByEmailFunc          func(ctx context.Context, email string) (EmailLookupResult, error)
}

func (f *fakeRepository) ListConnections(ctx context.Context, ownerID string) ([]Connection, error) {
	return f.listConnectionsFunc(ctx, ownerID)
}

func (f *fakeRepository) ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error) {
	return f.listPotentialConnectionsFunc(ctx, ownerID)
}

func (f *fakeRepository) CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
	return f.createConnectionFunc(ctx, payload, ownerID)
}

func (f *fakeRepository) UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
	return f.updateConnectionFunc(ctx, payload, contactID, ownerID)
}

func (f *fakeRepository) FindUserByEmail(ctx context.Context, email string) (EmailLookupResult, error) {
	return f.findUserByEmailFunc(ctx, email)
}

func TestListConnections(t *testing.T) {
	want := []Connection{{ContactID: "contact-id"}}
	repo := &fakeRepository{
		listConnectionsFunc: func(ctx context.Context, ownerID string) ([]Connection, error) {
			require.Equal(t, "owner-id", ownerID)
			return want, nil
		},
	}
	service := NewService(repo)
	got, err := service.ListConnections(context.Background(), "owner-id")
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func TestListPotentialConnections(t *testing.T) {
	want := []PotentialConnection{{UserID: "user-id", SharedEventCount: 2}}
	repo := &fakeRepository{
		listPotentialConnectionsFunc: func(ctx context.Context, ownerID string) ([]PotentialConnection, error) {
			require.Equal(t, "owner-id", ownerID)
			return want, nil
		},
	}
	service := NewService(repo)
	got, err := service.ListPotentialConnections(context.Background(), "owner-id")
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func TestCreateConnection(t *testing.T) {
	created := Connection{ContactID: "contact-id"}
	repo := &fakeRepository{
		createConnectionFunc: func(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
			require.Equal(t, "owner-id", ownerID)
			require.Equal(t, "contact-id", payload.ContactID)
			return created, nil
		},
	}
	service := NewService(repo)
	got, err := service.CreateConnection(context.Background(), CreateConnectionPayload{ContactID: "contact-id"}, "owner-id")
	require.NoError(t, err)
	require.Equal(t, created, got)
}

func TestCreateConnection_SelfConnection(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	_, err := service.CreateConnection(context.Background(), CreateConnectionPayload{ContactID: "owner-id"}, "owner-id")
	require.ErrorIs(t, err, ErrSelfConnection)
}

func TestCreateConnection_RepositoryError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepository{
		createConnectionFunc: func(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
			return Connection{}, repoErr
		},
	}
	service := NewService(repo)
	_, err := service.CreateConnection(context.Background(), CreateConnectionPayload{ContactID: "contact-id"}, "owner-id")
	require.ErrorIs(t, err, repoErr)
}

func TestUpdateConnection(t *testing.T) {
	updated := Connection{ContactID: "contact-id", IsFavorite: true}
	repo := &fakeRepository{
		updateConnectionFunc: func(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
			require.Equal(t, "contact-id", contactID)
			require.Equal(t, "owner-id", ownerID)
			return updated, nil
		},
	}
	service := NewService(repo)
	got, err := service.UpdateConnection(context.Background(), UpdateConnectionPayload{}, "contact-id", "owner-id")
	require.NoError(t, err)
	require.Equal(t, updated, got)
}

func TestUpdateConnection_NotFound(t *testing.T) {
	repo := &fakeRepository{
		updateConnectionFunc: func(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
			return Connection{}, ErrConnectionNotFound
		},
	}
	service := NewService(repo)
	_, err := service.UpdateConnection(context.Background(), UpdateConnectionPayload{}, "contact-id", "owner-id")
	require.ErrorIs(t, err, ErrConnectionNotFound)
}

func TestFindUserByEmail(t *testing.T) {
	want := EmailLookupResult{UserID: "user-id", Name: "Priya Shah", Email: "priya@example.com"}
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			require.Equal(t, "priya@example.com", email)
			return want, nil
		},
	}
	service := NewService(repo)
	got, err := service.FindUserByEmail(context.Background(), "  priya@example.com  ")
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func TestFindUserByEmail_EmptyEmail(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(repo)
	_, err := service.FindUserByEmail(context.Background(), "   ")
	require.ErrorIs(t, err, ErrEmailRequired)
}

func TestFindUserByEmail_NotFound(t *testing.T) {
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			return EmailLookupResult{}, ErrUserNotFound
		},
	}
	service := NewService(repo)
	_, err := service.FindUserByEmail(context.Background(), "missing@example.com")
	require.ErrorIs(t, err, ErrUserNotFound)
}
