package event

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	ID                   string     `json:"id" db:"id"`
	OwnerId              string     `json:"ownerId" db:"owner_id"`
	Name                 string     `json:"name" db:"name"`
	Description          string     `json:"description" db:"description"`
	CreatedAt            time.Time  `json:"createdAt" db:"created_at"`
	Date                 time.Time  `json:"date" db:"date"`
	Location             string     `json:"location" db:"location"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty" db:"rsvp_deadline"`
	Type                 EventType  `json:"type" db:"type"`
	DefaultSpreadAllowed int        `json:"defaultSpreadAllowed" db:"default_spread_allowed"`
}

type EventInvite struct {
	EventID       string            `json:"eventId" db:"event_id"`
	InvitedBy     string            `json:"invitedBy" db:"invited_by"`
	InvitedUserID string            `json:"invitedUserId" db:"invited_user_id"`
	Status        EventInviteStatus `json:"status" db:"status"`
	SpreadAllowed int               `json:"spreadAllowed" db:"spread_allowed"`
	CreatedAt     time.Time         `json:"createdAt" db:"created_at"`
}

type CreateEventPayload struct {
	Name                 string     `json:"name"`
	Description          string     `json:"description"`
	Date                 time.Time  `json:"date"`
	Location             string     `json:"location"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty"`
	Type                 EventType  `json:"type"`
	DefaultSpreadAllowed int        `json:"defaultSpreadAllowed"`
}

func (p *CreateEventPayload) Sanitize() {
	p.Name = strings.TrimSpace(p.Name)
	p.Description = strings.TrimSpace(p.Description)
	p.Location = strings.TrimSpace(p.Location)
}

func (p CreateEventPayload) Validate() error {
	if p.Name == "" {
		return errors.New("name must not be empty")
	}
	if p.DefaultSpreadAllowed < 0 {
		return errors.New("defaultSpreadAllowed can't be negative")
	}
	return nil
}

type CreateEventInvitePayload struct {
	EventID       string `json:"eventId"`
	InvitedUserID string `json:"invitedUserId"`
	SpreadAllowed int    `json:"spreadAllowed"`
}

func (p CreateEventInvitePayload) Validate() error {
	if err := uuid.Validate(p.EventID); err != nil {
		return errors.New("eventId isn't valid")
	}
	if err := uuid.Validate(p.InvitedUserID); err != nil {
		return errors.New("invitedUserId isn't valid")
	}
	if p.SpreadAllowed < 0 {
		return errors.New("spreadAllowed can't be negative")
	}
	return nil
}

type EventType string
type EventInviteStatus string

const (
	InviteStatePending  EventInviteStatus = "pending"
	InviteStateAccepted EventInviteStatus = "accepted"
	InviteStateDeclined EventInviteStatus = "declined"
)

type UpdateEventPayload struct {
	Name                 *string    `json:"name,omitempty"`
	Description          *string    `json:"description,omitempty"`
	Date                 *time.Time `json:"date,omitempty"`
	Location             *string    `json:"location,omitempty"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty"`
	Type                 *EventType `json:"type,omitempty"`
	DefaultSpreadAllowed *int       `json:"defaultSpreadAllowed,omitempty"`
}

func (p UpdateEventPayload) Validate() error {
	if p.DefaultSpreadAllowed != nil && *p.DefaultSpreadAllowed < 0 {
		return errors.New("defaultSpreadAllowed can't be negative")
	}
	return nil
}

type EventSortField string

const (
	EventSortFieldDate      EventSortField = "date"
	EventSortFieldCreatedAt EventSortField = "createdAt"
)

type SortOrder string

const (
	SortOrderAsc  SortOrder = "asc"
	SortOrderDesc SortOrder = "desc"
)

func ParseEventSortField(s string) (EventSortField, error) {
	switch EventSortField(s) {
	case "":
		return EventSortFieldDate, nil
	case EventSortFieldDate, EventSortFieldCreatedAt:
		return EventSortField(s), nil
	default:
		return "", fmt.Errorf("invalid sort field: %q", s)
	}
}

func ParseSortOrder(s string) (SortOrder, error) {
	switch SortOrder(s) {
	case "":
		return SortOrderDesc, nil
	case SortOrderAsc, SortOrderDesc:
		return SortOrder(s), nil
	default:
		return "", fmt.Errorf("invalid sort order: %q", s)
	}
}
