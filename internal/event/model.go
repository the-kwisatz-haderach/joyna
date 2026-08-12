package event

import "time"

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
	EventID       string    `json:"eventId" db:"event_id"`
	InvitedBy     string    `json:"invitedBy" db:"invited_by"`
	InvitedUserID string    `json:"invitedUserId" db:"invited_user"`
	Status        string    `json:"status" db:"status"`
	SpreadAllowed int       `json:"spreadAllowed" db:"spread_allowed"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
}

type EventType string

type EventUpdate struct {
	Name                 *string    `json:"name,omitempty"`
	Description          *string    `json:"description,omitempty"`
	Date                 *time.Time `json:"date,omitempty"`
	Location             *string    `json:"location,omitempty"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty"`
	Type                 *EventType `json:"type,omitempty"`
	DefaultSpreadAllowed *int       `json:"defaultSpreadAllowed,omitempty"`
}
