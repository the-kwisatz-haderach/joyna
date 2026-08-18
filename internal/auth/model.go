package auth

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrEmptyName     = errors.New("name can't be empty")
	ErrEmptyEmail    = errors.New("email can't be empty")
	ErrEmptyPassword = errors.New("password can't be empty")
)

type User struct {
	Id                string    `json:"id" db:"id"`
	Name              string    `json:"name" db:"name"`
	Email             string    `json:"email" db:"email"`
	JoinedAt          time.Time `json:"joinedAt" db:"joined_at"`
	ProfilePictureKey *string   `json:"profilePictureKey,omitempty" db:"profile_picture_key"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterUserPayload struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (p *RegisterUserPayload) Sanitize() {
	p.Name = strings.TrimSpace(p.Name)
	p.Email = strings.ToLower(strings.TrimSpace(p.Email))
	p.Password = strings.TrimSpace(p.Password)
}

func (p RegisterUserPayload) Validate() error {
	if p.Name == "" {
		return ErrEmptyName
	}
	if p.Email == "" {
		return ErrEmptyEmail
	}
	if p.Password == "" {
		return ErrEmptyPassword
	}
	return nil
}
