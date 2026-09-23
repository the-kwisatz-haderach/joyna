package auth

import (
	"context"
	"errors"
	"log/slog"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type repository interface {
	CreateUser(ctx context.Context, name, email, passwordHash string, address *string) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, string, error)
	UpdateUser(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error)
}

// inviteResolver is satisfied structurally by *network.Service (no import of
// the network package needed) so a freshly registered user gets connected to
// whoever invited their email address, mirroring internal/event's `notifier`
// interface pattern. Optional: nil is a valid no-op resolver.
type inviteResolver interface {
	ResolvePendingInvites(ctx context.Context, userID, email string) error
}

// templateSeeder is satisfied structurally by *eventtemplate.Service so a
// freshly registered user gets a starter set of event templates. Optional:
// nil is a valid no-op seeder.
type templateSeeder interface {
	SeedDefaultTemplates(ctx context.Context, ownerID string) error
}

type Service struct {
	repo     repository
	resolver inviteResolver
	seeder   templateSeeder
}

func NewService(repo repository, resolver inviteResolver, seeder templateSeeder) *Service {
	return &Service{repo: repo, resolver: resolver, seeder: seeder}
}

func (s *Service) Register(ctx context.Context, name, email, password string, address *string) (User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("failed to generate hash from password", "error", err)
		return User{}, err
	}

	user, err := s.repo.CreateUser(ctx, name, email, string(hash), address)
	if err != nil {
		return User{}, err
	}

	if s.resolver != nil {
		if err := s.resolver.ResolvePendingInvites(ctx, user.Id, user.Email); err != nil {
			// A failed auto-connect must not fail registration — the
			// account already exists at this point.
			slog.Error("failed to resolve pending network invites", "error", err, "userId", user.Id)
		}
	}

	if s.seeder != nil {
		if err := s.seeder.SeedDefaultTemplates(ctx, user.Id); err != nil {
			// Same reasoning as the resolver above: missing default
			// templates shouldn't fail an otherwise-successful registration.
			slog.Error("failed to seed default event templates", "error", err, "userId", user.Id)
		}
	}

	return user, nil
}

func (s *Service) UpdateUser(ctx context.Context, userUpdate UpdateUserPayload, userID string) (User, error) {
	return s.repo.UpdateUser(ctx, userUpdate, userID)
}

func (s *Service) Authenticate(ctx context.Context, email, password string) (User, error) {
	user, hash, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return User{}, ErrInvalidCredentials
		}
		slog.Error("couldn't find user", "error", err)
		return User{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		slog.Debug("password comparison failed", "error", err)
		return User{}, ErrInvalidCredentials
	}

	return user, nil
}
