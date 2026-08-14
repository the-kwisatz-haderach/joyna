package group

import (
	"errors"
	"strings"
	"time"
)

type Group struct {
	ID         string    `json:"id" db:"id"`
	OwnerID    string    `json:"ownerId" db:"owner_id"`
	Name       string    `json:"name" db:"name"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	IsFavorite bool      `json:"isFavorite" db:"is_favorite"`
}

type CreateGroupPayload struct {
	Name string `json:"name"`
}

func (p CreateGroupPayload) Validate() error {
	if p.Name == "" {
		return errors.New("group name must not be empty")
	}
	return nil
}

func (p *CreateGroupPayload) Sanitize() {
	p.Name = strings.TrimSpace(p.Name)
}
