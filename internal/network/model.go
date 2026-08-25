package network

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Connection struct {
	ContactID       string    `json:"contactId" db:"contact_id"`
	ContactName     string    `json:"contactName" db:"contact_name"`
	ContactEmail    string    `json:"contactEmail" db:"contact_email"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	IsFavorite      bool      `json:"isFavorite" db:"is_favorite"`
	GroupID         *string   `json:"groupId,omitempty" db:"group_id"`
	GroupName       *string   `json:"groupName,omitempty" db:"group_name"`
	GroupIsFavorite *bool     `json:"groupIsFavorite,omitempty" db:"group_is_favorite"`
}

// PotentialConnection is a user who attended an event the requesting user
// also attended (as owner or invitee), and who isn't yet in their network.
type PotentialConnection struct {
	UserID           string `json:"userId" db:"user_id"`
	Name             string `json:"name" db:"name"`
	Email            string `json:"email" db:"email"`
	SharedEventCount int    `json:"sharedEventCount" db:"shared_event_count"`
}

type CreateConnectionPayload struct {
	ContactID string  `json:"contactId"`
	GroupID   *string `json:"groupId,omitempty"`
}

var (
	ErrInvalidContactID = errors.New("contactId isn't valid")
	ErrInvalidGroupID   = errors.New("groupId isn't valid")
	ErrSelfConnection   = errors.New("can't add yourself to your network")
)

func (p CreateConnectionPayload) Validate() error {
	if err := uuid.Validate(p.ContactID); err != nil {
		return ErrInvalidContactID
	}
	if p.GroupID != nil {
		if err := uuid.Validate(*p.GroupID); err != nil {
			return ErrInvalidGroupID
		}
	}
	return nil
}

// UpdateConnectionPayload partially updates a connection. GroupID follows a
// three-state convention: nil leaves the group unchanged, a pointer to an
// empty string clears it back to the default "Acquaintances" bucket, and any
// other value must be a valid group id to move the contact into that group.
type UpdateConnectionPayload struct {
	GroupID    *string `json:"groupId,omitempty"`
	IsFavorite *bool   `json:"isFavorite,omitempty"`
}

func (p UpdateConnectionPayload) Validate() error {
	if p.GroupID != nil && *p.GroupID != "" {
		if err := uuid.Validate(*p.GroupID); err != nil {
			return ErrInvalidGroupID
		}
	}
	return nil
}
