package group

import "time"

type Group struct {
	ID         string    `json:"id" db:"id"`
	OwnerID    string    `json:"ownerId" db:"owner_id"`
	Name       string    `json:"name" db:"name"`
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
	IsFavorite bool      `json:"isFavorite" db:"is_favorite"`
}
