package notification

import (
	"errors"
	"time"
)

var (
	ErrInvalidPushSubscription  = errors.New("endpoint, p256dh and auth are all required")
	ErrPushSubscriptionNotFound = errors.New("push subscription not found")
)

// Type is an alias (not a distinct named type) for string so that any
// service exposing a `Notify(ctx, userID, notifType string, payload
// map[string]any) error` method — such as this package's own Service —
// automatically satisfies other domains' unexported `notifier` interfaces
// without those domains importing this package.
type Type = string

const (
	TypeEventInvite          Type = "event_invite"
	TypeEventUninvite        Type = "event_uninvite"
	TypeInviteResponse       Type = "invite_response"
	TypeEventUpdated         Type = "event_updated"
	TypeRsvpDeadlineReminder Type = "rsvp_deadline_reminder"
	TypeEventStartingToday   Type = "event_starting_today"
)

// Notification is a user-facing feed item. EventName/ActorName are resolved
// at read time from the event/actor IDs embedded in payload (rather than
// snapshotted at creation), so a since-renamed event or user always renders
// under its current name. Status is only populated for TypeInviteResponse.
type Notification struct {
	ID        string    `json:"id" db:"id"`
	Type      Type      `json:"type" db:"type"`
	EventID   *string   `json:"eventId,omitempty" db:"event_id"`
	EventName *string   `json:"eventName,omitempty" db:"event_name"`
	ActorID   *string   `json:"actorId,omitempty" db:"actor_id"`
	ActorName *string   `json:"actorName,omitempty" db:"actor_name"`
	Status    *string   `json:"status,omitempty" db:"status"`
	IsRead    bool      `json:"isRead" db:"is_read"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// PushSubscription is a browser's Web Push subscription — the three fields
// the Push API's PushSubscription object provides on the client.
type PushSubscription struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"userId" db:"user_id"`
	Endpoint  string    `json:"endpoint" db:"endpoint"`
	P256dh    string    `json:"p256dh" db:"p256dh"`
	Auth      string    `json:"auth" db:"auth"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// SubscribeToPushPayload is what the frontend posts after
// pushManager.subscribe() succeeds.
type SubscribeToPushPayload struct {
	Endpoint string `json:"endpoint"`
	P256dh   string `json:"p256dh"`
	Auth     string `json:"auth"`
}

func (p SubscribeToPushPayload) Validate() error {
	if p.Endpoint == "" || p.P256dh == "" || p.Auth == "" {
		return ErrInvalidPushSubscription
	}
	return nil
}

// UnsubscribeFromPushPayload identifies which subscription to remove.
type UnsubscribeFromPushPayload struct {
	Endpoint string `json:"endpoint"`
}
