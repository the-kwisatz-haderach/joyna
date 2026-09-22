package network

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"strings"
)

type repository interface {
	ListConnections(ctx context.Context, ownerID string) ([]Connection, error)
	ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error)
	CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error)
	UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error)
	DeleteConnection(ctx context.Context, contactID, ownerID string) error
	FindUserByEmail(ctx context.Context, email string) (EmailLookupResult, error)
	CreateOrRefreshInvite(ctx context.Context, inviterID, email string) (NetworkInvite, error)
	ListPendingInvitesByEmail(ctx context.Context, email string) ([]NetworkInvite, error)
	MarkInviteAccepted(ctx context.Context, inviteID string) error
	CreateMutualConnection(ctx context.Context, userA, userB string) error
}

// mailer is satisfied structurally by *mail.SMTPMailer (see
// internal/platform/mail) without importing that package here, mirroring
// internal/event's `notifier` interface.
type mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

type Service struct {
	repo        repository
	mailer      mailer
	frontendURL string
}

func NewService(repo repository, mailer mailer, frontendURL string) *Service {
	return &Service{repo: repo, mailer: mailer, frontendURL: frontendURL}
}

func (s *Service) ListConnections(ctx context.Context, ownerID string) ([]Connection, error) {
	return s.repo.ListConnections(ctx, ownerID)
}

func (s *Service) ListPotentialConnections(ctx context.Context, ownerID string) ([]PotentialConnection, error) {
	return s.repo.ListPotentialConnections(ctx, ownerID)
}

func (s *Service) CreateConnection(ctx context.Context, payload CreateConnectionPayload, ownerID string) (Connection, error) {
	if payload.ContactID == ownerID {
		return Connection{}, ErrSelfConnection
	}
	return s.repo.CreateConnection(ctx, payload, ownerID)
}

func (s *Service) UpdateConnection(ctx context.Context, payload UpdateConnectionPayload, contactID, ownerID string) (Connection, error) {
	return s.repo.UpdateConnection(ctx, payload, contactID, ownerID)
}

func (s *Service) DeleteConnection(ctx context.Context, contactID, ownerID string) error {
	return s.repo.DeleteConnection(ctx, contactID, ownerID)
}

func (s *Service) FindUserByEmail(ctx context.Context, email string) (EmailLookupResult, error) {
	email = strings.TrimSpace(email)
	if email == "" {
		return EmailLookupResult{}, ErrEmailRequired
	}
	return s.repo.FindUserByEmail(ctx, email)
}

// InviteByEmail sends a registration invite to an email with no account
// yet. It re-checks FindUserByEmail itself (rather than trusting the
// frontend's earlier lookup) to guard the race where the address registers
// between that lookup and this call.
func (s *Service) InviteByEmail(ctx context.Context, inviterID, email string) (NetworkInvite, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return NetworkInvite{}, ErrEmailRequired
	}

	if _, err := s.repo.FindUserByEmail(ctx, email); err == nil {
		return NetworkInvite{}, ErrEmailAlreadyRegistered
	} else if !errors.Is(err, ErrUserNotFound) {
		return NetworkInvite{}, err
	}

	invite, err := s.repo.CreateOrRefreshInvite(ctx, inviterID, email)
	if err != nil {
		return NetworkInvite{}, err
	}

	link := fmt.Sprintf("%s/register?email=%s", s.frontendURL, url.QueryEscape(email))
	body := fmt.Sprintf(
		"You've been invited to join Joyna! Create your account to connect: %s",
		link,
	)
	if err := s.mailer.Send(ctx, email, "You're invited to Joyna", body); err != nil {
		return NetworkInvite{}, fmt.Errorf("sending invite email: %w", err)
	}

	return invite, nil
}

// ResolvePendingInvites is called from auth.Service.Register once a new
// account exists (satisfying auth's unexported `inviteResolver` interface).
// It connects the new user to every inviter who invited this email address,
// in both directions, and marks each invite accepted. One bad invite
// doesn't stop the rest from resolving.
func (s *Service) ResolvePendingInvites(ctx context.Context, userID, email string) error {
	invites, err := s.repo.ListPendingInvitesByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return err
	}

	var errs []error
	for _, invite := range invites {
		if err := s.repo.CreateMutualConnection(ctx, invite.InviterID, userID); err != nil {
			errs = append(errs, fmt.Errorf("connecting invite %s: %w", invite.ID, err))
			continue
		}
		if err := s.repo.MarkInviteAccepted(ctx, invite.ID); err != nil {
			errs = append(errs, fmt.Errorf("accepting invite %s: %w", invite.ID, err))
		}
	}
	return errors.Join(errs...)
}
