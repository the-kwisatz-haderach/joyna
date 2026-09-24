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
	Mood                 []Mood     `json:"mood,omitempty" db:"mood"`
	Icon                 *string    `json:"icon,omitempty" db:"icon"`
	Latitude             *float64   `json:"latitude,omitempty" db:"latitude"`
	Longitude            *float64   `json:"longitude,omitempty" db:"longitude"`
}

type EventInvite struct {
	EventID       string            `json:"eventId" db:"event_id"`
	InvitedBy     string            `json:"invitedBy" db:"invited_by"`
	InvitedUserID string            `json:"invitedUserId" db:"invited_user_id"`
	Status        EventInviteStatus `json:"status" db:"status"`
	SpreadAllowed int               `json:"spreadAllowed" db:"spread_allowed"`
	CreatedAt     time.Time         `json:"createdAt" db:"created_at"`
	DeclineReason *string           `json:"declineReason,omitempty" db:"decline_reason"`
}

// EventView is an Event enriched with the requesting viewer's relationship
// to it, since the detail page renders owner/invitee actions differently.
type EventView struct {
	Event
	IsOwner             bool               `json:"isOwner"`
	ViewerInviteStatus  *EventInviteStatus `json:"viewerInviteStatus,omitempty"`
	ViewerSpreadAllowed *int               `json:"viewerSpreadAllowed,omitempty"`
	ViewerDeclineReason *string            `json:"viewerDeclineReason,omitempty"`
}

// Attendee is a user associated with an event: its owner, or anyone with an
// invite (pending, accepted, or declined). The owner row has no meaningful
// Status/InvitedBy since they aren't invited to their own event.
type Attendee struct {
	UserID        string            `json:"userId" db:"user_id"`
	Name          string            `json:"name" db:"name"`
	Email         string            `json:"email" db:"email"`
	IsOwner       bool              `json:"isOwner" db:"is_owner"`
	Status        EventInviteStatus `json:"status,omitempty" db:"status"`
	InvitedBy     string            `json:"invitedBy,omitempty" db:"invited_by"`
	DeclineReason *string           `json:"declineReason,omitempty" db:"decline_reason"`
}

// ReminderInvite is the minimal shape needed to raise a daily reminder
// notification for an invitee — just enough to notify without pulling in
// the rest of the event/invite row.
type ReminderInvite struct {
	EventID       string `db:"event_id"`
	InvitedUserID string `db:"invited_user_id"`
}

type RespondToEventInvitePayload struct {
	Status EventInviteStatus `json:"status"`
	Reason *string           `json:"reason,omitempty"`
}

func (p *RespondToEventInvitePayload) Sanitize() {
	if p.Reason == nil {
		return
	}
	trimmed := strings.TrimSpace(*p.Reason)
	if trimmed == "" {
		p.Reason = nil
		return
	}
	p.Reason = &trimmed
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
	Mood                 []Mood     `json:"mood,omitempty"`
	Icon                 *string    `json:"icon,omitempty"`
	Latitude             *float64   `json:"latitude,omitempty"`
	Longitude            *float64   `json:"longitude,omitempty"`
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
	if p.Icon != nil {
		trimmed := strings.TrimSpace(*p.Icon)
		p.Icon = &trimmed
	}
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
type Mood string
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
	// Mood is nil when omitted (leaving moods unchanged) and a non-nil,
	// possibly-empty slice when the client sent an explicit mood list
	// (including clearing every mood) — encoding/json already distinguishes
	// an absent key from `"mood": []` this way, so no separate Clear flag
	// is needed the way ClearIcon is for the *string Icon field below.
	Mood      []Mood   `json:"mood,omitempty"`
	Icon      *string  `json:"icon,omitempty"`
	ClearIcon bool     `json:"clearIcon,omitempty"`
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`
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
