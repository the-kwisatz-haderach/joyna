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

// EventView is an Event enriched with the requesting viewer's relationship
// to it, since the detail page renders owner/invitee actions differently.
type EventView struct {
	Event
	IsOwner             bool               `json:"isOwner"`
	ViewerInviteStatus  *EventInviteStatus `json:"viewerInviteStatus,omitempty"`
}

// Attendee is a user attending an event, either as its owner or via an
// invite that hasn't been declined.
type Attendee struct {
	UserID  string `json:"userId" db:"user_id"`
	Name    string `json:"name" db:"name"`
	Email   string `json:"email" db:"email"`
	IsOwner bool   `json:"isOwner" db:"is_owner"`
}

type RespondToEventInvitePayload struct {
	Status EventInviteStatus `json:"status"`
}

func (p RespondToEventInvitePayload) Validate() error {
	if p.Status != InviteStateAccepted && p.Status != InviteStateDeclined {
		return ErrInvalidInviteStatus
	}
	return nil
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

var (
	ErrNegativeSpread       = errors.New("spread can't be negative")
	ErrInvalidEventId       = errors.New("eventId isn't valid")
	ErrInvalidInvitedUserId = errors.New("invitedUserId isn't valid")
	ErrInvalidInviteStatus  = errors.New("status must be 'accepted' or 'declined'")
)

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
		return ErrNegativeSpread
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
		return ErrInvalidEventId
	}
	if err := uuid.Validate(p.InvitedUserID); err != nil {
		return ErrInvalidInvitedUserId
	}
	if p.SpreadAllowed < 0 {
		return ErrNegativeSpread
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
		return ErrNegativeSpread
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

type EventListScope string

const (
	EventListScopeOwned   EventListScope = "owned"
	EventListScopeInvited EventListScope = "invited"
	EventListScopeAll     EventListScope = "all"
)

func ParseEventListScope(s string) (EventListScope, error) {
	switch EventListScope(s) {
	case "":
		return EventListScopeOwned, nil
	case EventListScopeOwned, EventListScopeInvited, EventListScopeAll:
		return EventListScope(s), nil
	default:
		return "", fmt.Errorf("invalid scope: %q", s)
	}
}
