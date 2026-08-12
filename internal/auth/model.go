package auth

import "time"

type User struct {
	Id                string    `json:"id" db:"id"`
	Name              string    `json:"name" db:"name"`
	Email             string    `json:"email" db:"email"`
	JoinedAt          time.Time `json:"joinedAt" db:"joined_at"`
	ProfilePictureKey *string   `json:"profilePictureKey,omitempty" db:"profile_picture_key"`
}
