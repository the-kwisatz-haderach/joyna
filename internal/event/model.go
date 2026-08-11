package event

import "time"

type Event struct {
	ID                   string     `json:"id"`
	OwnerId              string     `json:"ownerId"`
	Name                 string     `json:"name"`
	Description          string     `json:"description"`
	CreatedAt            time.Time  `json:"createdAt"`
	Date                 time.Time  `json:"date"`
	Location             string     `json:"location"`
	RsvpDeadline         *time.Time `json:"rsvpDeadline,omitempty"`
	Type                 EventType  `json:"type"`
	DefaultSpreadAllowed int        `json:"defaultSpreadAllowed"`
}

type EventInvite struct {
	EventID       string    `json:"eventId"`
	InvitedBy     string    `json:"invitedBy"`
	InvitedUserID string    `json:"invitedUserId"`
	Status        string    `json:"status"`
	SpreadAllowed int       `json:"spreadAllowed"`
	CreatedAt     time.Time `json:"createdAt"`
}

type EventType string
