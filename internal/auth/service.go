package auth

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type repository interface {
	CreateUser(ctx context.Context, name, email, passwordHash string) (User, error)
	GetUserByEmail(ctx context.Context, email string) (User, string, error)
}

type Service struct {
	repo repository
}

func NewService(repo repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Register(ctx context.Context, name, email, password string) (User, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return User{}, err
	}

	return s.repo.CreateUser(ctx, name, email, string(hash))
}

func (s *Service) Authenticate(ctx context.Context, email, password string) (User, error) {
	user, hash, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return User{}, ErrInvalidCredentials
		}
		return User{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}

	return user, nil
}
