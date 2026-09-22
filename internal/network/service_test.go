package network

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakeRepository struct {
	listConnectionsFunc           func(ctx context.Context, ownerID string) ([]Connection, error)
	listPotentialConnectionsFunc  func(ctx context.Context, ownerID string) ([]PotentialConnection, error)
	createConnectionFunc          func(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error)
	updateConnectionFunc          func(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error)
	deleteConnectionFunc          func(ctx context.Context, contactID, ownerID string) error
	findUserByEmailFunc           func(ctx context.Context, email string) (EmailLookupResult, error)
	createOrRefreshInviteFunc     func(ctx context.Context, inviterID, email string) (NetworkInvite, error)
	listPendingInvitesByEmailFunc func(ctx context.Context, email string) ([]NetworkInvite, error)
	markInviteAcceptedFunc        func(ctx context.Context, inviteID string) error
	createMutualConnectionFunc    func(ctx context.Context, userA, userB string) error
}

func (f *fakeRepository) CreateOrRefreshInvite(ctx context.Context, inviterID, email string) (NetworkInvite, error) {
	return f.createOrRefreshInviteFunc(ctx, inviterID, email)
}

func (f *fakeRepository) ListPendingInvitesByEmail(ctx context.Context, email string) ([]NetworkInvite, error) {
	return f.listPendingInvitesByEmailFunc(ctx, email)
}

func (f *fakeRepository) MarkInviteAccepted(ctx context.Context, inviteID string) error {
	return f.markInviteAcceptedFunc(ctx, inviteID)
}

func (f *fakeRepository) CreateMutualConnection(ctx context.Context, userA, userB string) error {
	return f.createMutualConnectionFunc(ctx, userA, userB)
}

type fakeMailer struct {
	sendFunc func(ctx context.Context, to, subject, body string) error
}

func (f *fakeMailer) Send(ctx context.Context, to, subject, body string) error {
	if f.sendFunc == nil {
		return nil
	}
	return f.sendFunc(ctx, to, subject, body)
}

func newTestService(repo repository) *Service {
	return NewService(repo, &fakeMailer{}, "https://joyna.test")
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

func (f *fakeRepository) DeleteConnection(ctx context.Context, contactID, ownerID string) error {
	return f.deleteConnectionFunc(ctx, contactID, ownerID)
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
	service := newTestService(repo)
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
	service := newTestService(repo)
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
	service := newTestService(repo)
	got, err := service.CreateConnection(context.Background(), CreateConnectionPayload{ContactID: "contact-id"}, "owner-id")
	require.NoError(t, err)
	require.Equal(t, created, got)
}

func TestCreateConnection_SelfConnection(t *testing.T) {
	repo := &fakeRepository{}
	service := newTestService(repo)
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
	service := newTestService(repo)
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
	service := newTestService(repo)
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
	service := newTestService(repo)
	_, err := service.UpdateConnection(context.Background(), UpdateConnectionPayload{}, "contact-id", "owner-id")
	require.ErrorIs(t, err, ErrConnectionNotFound)
}

func TestDeleteConnection(t *testing.T) {
	repo := &fakeRepository{
		deleteConnectionFunc: func(ctx context.Context, contactID, ownerID string) error {
			require.Equal(t, "contact-id", contactID)
			require.Equal(t, "owner-id", ownerID)
			return nil
		},
	}
	service := newTestService(repo)
	err := service.DeleteConnection(context.Background(), "contact-id", "owner-id")
	require.NoError(t, err)
}

func TestDeleteConnection_NotFound(t *testing.T) {
	repo := &fakeRepository{
		deleteConnectionFunc: func(ctx context.Context, contactID, ownerID string) error {
			return ErrConnectionNotFound
		},
	}
	service := newTestService(repo)
	err := service.DeleteConnection(context.Background(), "contact-id", "owner-id")
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
	service := newTestService(repo)
	got, err := service.FindUserByEmail(context.Background(), "  priya@example.com  ")
	require.NoError(t, err)
	require.Equal(t, want, got)
}

func TestFindUserByEmail_EmptyEmail(t *testing.T) {
	repo := &fakeRepository{}
	service := newTestService(repo)
	_, err := service.FindUserByEmail(context.Background(), "   ")
	require.ErrorIs(t, err, ErrEmailRequired)
}

func TestFindUserByEmail_NotFound(t *testing.T) {
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			return EmailLookupResult{}, ErrUserNotFound
		},
	}
	service := newTestService(repo)
	_, err := service.FindUserByEmail(context.Background(), "missing@example.com")
	require.ErrorIs(t, err, ErrUserNotFound)
}

func TestInviteByEmail(t *testing.T) {
	invite := NetworkInvite{ID: "invite-id", InviterID: "owner-id", InvitedEmail: "new@example.com"}
	var sentTo, sentBody string
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			return EmailLookupResult{}, ErrUserNotFound
		},
		createOrRefreshInviteFunc: func(ctx context.Context, inviterID, email string) (NetworkInvite, error) {
			require.Equal(t, "owner-id", inviterID)
			require.Equal(t, "new@example.com", email)
			return invite, nil
		},
	}
	mailer := &fakeMailer{
		sendFunc: func(ctx context.Context, to, subject, body string) error {
			sentTo = to
			sentBody = body
			return nil
		},
	}
	service := NewService(repo, mailer, "https://joyna.test")
	got, err := service.InviteByEmail(context.Background(), "owner-id", "  New@Example.com  ")
	require.NoError(t, err)
	require.Equal(t, invite, got)
	require.Equal(t, "new@example.com", sentTo)
	require.Contains(t, sentBody, "https://joyna.test/register?email=new%40example.com")
}

func TestInviteByEmail_AlreadyRegistered(t *testing.T) {
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			return EmailLookupResult{UserID: "existing-id"}, nil
		},
	}
	service := newTestService(repo)
	_, err := service.InviteByEmail(context.Background(), "owner-id", "existing@example.com")
	require.ErrorIs(t, err, ErrEmailAlreadyRegistered)
}

func TestInviteByEmail_EmptyEmail(t *testing.T) {
	repo := &fakeRepository{}
	service := newTestService(repo)
	_, err := service.InviteByEmail(context.Background(), "owner-id", "   ")
	require.ErrorIs(t, err, ErrEmailRequired)
}

func TestInviteByEmail_MailerError(t *testing.T) {
	mailerErr := errors.New("smtp down")
	repo := &fakeRepository{
		findUserByEmailFunc: func(ctx context.Context, email string) (EmailLookupResult, error) {
			return EmailLookupResult{}, ErrUserNotFound
		},
		createOrRefreshInviteFunc: func(ctx context.Context, inviterID, email string) (NetworkInvite, error) {
			return NetworkInvite{ID: "invite-id"}, nil
		},
	}
	mailer := &fakeMailer{
		sendFunc: func(ctx context.Context, to, subject, body string) error {
			return mailerErr
		},
	}
	service := NewService(repo, mailer, "https://joyna.test")
	_, err := service.InviteByEmail(context.Background(), "owner-id", "new@example.com")
	require.ErrorIs(t, err, mailerErr)
}

func TestResolvePendingInvites(t *testing.T) {
	invites := []NetworkInvite{
		{ID: "invite-1", InviterID: "inviter-1"},
		{ID: "invite-2", InviterID: "inviter-2"},
	}
	var connected [][2]string
	var accepted []string
	repo := &fakeRepository{
		listPendingInvitesByEmailFunc: func(ctx context.Context, email string) ([]NetworkInvite, error) {
			require.Equal(t, "new@example.com", email)
			return invites, nil
		},
		createMutualConnectionFunc: func(ctx context.Context, userA, userB string) error {
			connected = append(connected, [2]string{userA, userB})
			return nil
		},
		markInviteAcceptedFunc: func(ctx context.Context, inviteID string) error {
			accepted = append(accepted, inviteID)
			return nil
		},
	}
	service := newTestService(repo)
	err := service.ResolvePendingInvites(context.Background(), "new-user-id", "  New@Example.com ")
	require.NoError(t, err)
	require.ElementsMatch(t, [][2]string{{"inviter-1", "new-user-id"}, {"inviter-2", "new-user-id"}}, connected)
	require.ElementsMatch(t, []string{"invite-1", "invite-2"}, accepted)
}

func TestResolvePendingInvites_ContinuesPastAFailedInvite(t *testing.T) {
	invites := []NetworkInvite{
		{ID: "invite-1", InviterID: "inviter-1"},
		{ID: "invite-2", InviterID: "inviter-2"},
	}
	var accepted []string
	repo := &fakeRepository{
		listPendingInvitesByEmailFunc: func(ctx context.Context, email string) ([]NetworkInvite, error) {
			return invites, nil
		},
		createMutualConnectionFunc: func(ctx context.Context, userA, userB string) error {
			if userA == "inviter-1" {
				return errors.New("boom")
			}
			return nil
		},
		markInviteAcceptedFunc: func(ctx context.Context, inviteID string) error {
			accepted = append(accepted, inviteID)
			return nil
		},
	}
	service := newTestService(repo)
	err := service.ResolvePendingInvites(context.Background(), "new-user-id", "new@example.com")
	require.Error(t, err)
	require.Equal(t, []string{"invite-2"}, accepted)
}
