package notification

import "time"

// Type is an alias (not a distinct named type) for string so that any
// service exposing a `Notify(ctx, userID, notifType string, payload
// map[string]any) error` method — such as this package's own Service —
// automatically satisfies other domains' unexported `notifier` interfaces
// without those domains importing this package.
type Type = string

const (
	TypeEventInvite    Type = "event_invite"
	TypeInviteResponse Type = "invite_response"
	TypeEventUpdated   Type = "event_updated"
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
