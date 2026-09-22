package notification

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/the-kwisatz-haderach/joyna/internal/platform/push"
)

// PageSize is the fixed number of notifications returned per page by
// ListForUser.
const PageSize = 30

type repository interface {
	Create(ctx context.Context, userID string, notifType Type, payload map[string]any) error
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]Notification, error)
	CountByUser(ctx context.Context, userID string) (int, error)
	MarkAllAsRead(ctx context.Context, userID string) error
	CountUnread(ctx context.Context, userID string) (int, error)
	CreateOrRefreshPushSubscription(ctx context.Context, userID, endpoint, p256dh, auth string) (PushSubscription, error)
	ListPushSubscriptionsByUser(ctx context.Context, userID string) ([]PushSubscription, error)
	DeletePushSubscription(ctx context.Context, userID, endpoint string) error
	DeletePushSubscriptionByID(ctx context.Context, id string) error
	NotificationContext(ctx context.Context, eventID, actorID string) (eventName, actorName string, err error)
}

type Service struct {
	repo           repository
	pusher         push.Pusher
	vapidPublicKey string
}

func NewService(repo repository, pusher push.Pusher, vapidPublicKey string) *Service {
	return &Service{repo: repo, pusher: pusher, vapidPublicKey: vapidPublicKey}
}

// Notify records a new notification for userID. Other domains raise
// notifications through this method (satisfying their own unexported
// `notifier` interface) without importing this package. After recording it,
// best-effort fans it out as a browser push notification to every device
// userID has subscribed — a failed or unconfigured push never fails the
// in-app notification.
func (s *Service) Notify(ctx context.Context, userID string, notifType Type, payload map[string]any) error {
	if err := s.repo.Create(ctx, userID, notifType, payload); err != nil {
		return err
	}
	s.sendPush(ctx, userID, notifType, payload)
	return nil
}

func (s *Service) sendPush(ctx context.Context, userID string, notifType Type, payload map[string]any) {
	if s.pusher == nil {
		return
	}

	subs, err := s.repo.ListPushSubscriptionsByUser(ctx, userID)
	if err != nil {
		slog.Error("failed to list push subscriptions", "error", err)
		return
	}
	if len(subs) == 0 {
		return
	}

	title, body, url := s.renderPushMessage(ctx, notifType, payload)

	for _, sub := range subs {
		err := s.pusher.Send(ctx, sub.Endpoint, sub.P256dh, sub.Auth, title, body, url)
		if err == nil {
			continue
		}
		if errors.Is(err, push.ErrSubscriptionExpired) {
			if delErr := s.repo.DeletePushSubscriptionByID(ctx, sub.ID); delErr != nil {
				slog.Error("failed to delete expired push subscription", "error", delErr)
			}
			continue
		}
		slog.Error("failed to send push notification", "error", err)
	}
}

func stringField(payload map[string]any, key string) string {
	v, _ := payload[key].(string)
	return v
}

func withFallback(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

// renderPushMessage builds the title/body/deep-link shown by the OS push
// notification for notifType/payload, resolving event/actor display names
// on demand (only called when the user actually has push subscriptions, to
// avoid the extra query otherwise).
func (s *Service) renderPushMessage(ctx context.Context, notifType Type, payload map[string]any) (title, body, url string) {
	eventID := stringField(payload, "eventId")
	actorID := stringField(payload, "actorId")
	status := stringField(payload, "status")

	eventName, actorName, err := s.repo.NotificationContext(ctx, eventID, actorID)
	if err != nil {
		slog.Error("failed to resolve notification context", "error", err)
	}
	eventName = withFallback(eventName, "an event")
	actorName = withFallback(actorName, "Someone")

	if eventID != "" {
		url = "/events/" + eventID
	}

	switch notifType {
	case TypeEventInvite:
		return "New invite", fmt.Sprintf("%s invited you to %s", actorName, eventName), url
	case TypeEventUninvite:
		return "Invite withdrawn", fmt.Sprintf("You were removed from %s", eventName), url
	case TypeInviteResponse:
		verb := "responded to"
		switch status {
		case "accepted":
			verb = "accepted your invite to"
		case "declined":
			verb = "declined your invite to"
		}
		return "RSVP update", fmt.Sprintf("%s %s %s", actorName, verb, eventName), url
	case TypeEventUpdated:
		return "Event updated", fmt.Sprintf("%s was updated", eventName), url
	case TypeRsvpDeadlineReminder:
		return "RSVP reminder", fmt.Sprintf("The RSVP deadline for %s is approaching", eventName), url
	case TypeEventStartingToday:
		return "Happening today", fmt.Sprintf("%s is happening today", eventName), url
	default:
		return "New notification", fmt.Sprintf("You have a new update on %s", eventName), url
	}
}

// SubscribeToPush registers (or refreshes) userID's browser push
// subscription.
func (s *Service) SubscribeToPush(ctx context.Context, userID string, payload SubscribeToPushPayload) (PushSubscription, error) {
	if err := payload.Validate(); err != nil {
		return PushSubscription{}, err
	}
	return s.repo.CreateOrRefreshPushSubscription(ctx, userID, payload.Endpoint, payload.P256dh, payload.Auth)
}

// UnsubscribeFromPush removes userID's subscription for payload.Endpoint.
func (s *Service) UnsubscribeFromPush(ctx context.Context, userID string, payload UnsubscribeFromPushPayload) error {
	return s.repo.DeletePushSubscription(ctx, userID, payload.Endpoint)
}

// VAPIDPublicKey returns the configured VAPID public key, fetched once by
// the frontend to build the applicationServerKey passed to
// pushManager.subscribe(). Empty if push isn't configured.
func (s *Service) VAPIDPublicKey() string {
	return s.vapidPublicKey
}

// ListForUser returns page (1-indexed) of userID's notifications, PageSize
// per page, alongside the total notification count, with IsRead reflecting
// each one's state as of just before this call — then marks them all read.
// Visiting the notifications screen is what flips them, so the caller still
// sees what was unread on this particular visit, regardless of which page it
// requested.
func (s *Service) ListForUser(ctx context.Context, userID string, page int) ([]Notification, int, error) {
	if page < 1 {
		page = 1
	}

	total, err := s.repo.CountByUser(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	notifications, err := s.repo.ListByUser(ctx, userID, PageSize, (page-1)*PageSize)
	if err != nil {
		return nil, 0, err
	}
	if err := s.repo.MarkAllAsRead(ctx, userID); err != nil {
		return nil, 0, err
	}
	return notifications, total, nil
}

func (s *Service) UnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.CountUnread(ctx, userID)
}
