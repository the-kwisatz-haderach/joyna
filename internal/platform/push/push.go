// Package push sends browser Web Push notifications, signed with a VAPID
// keypair. It's intentionally provider-agnostic — standard Push API, no
// third-party push service (Firebase, etc.) required.
package push

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	webpush "github.com/SherClockHolmes/webpush-go"
)

// ErrSubscriptionExpired means the push service rejected the subscription
// as gone (the browser uninstalled it, cleared data, etc.) — the caller
// should delete it rather than retry.
var ErrSubscriptionExpired = errors.New("push subscription expired")

// Pusher sends a single push notification to one subscription. Domains that
// need to send push depend on this interface (see internal/notification's
// use) rather than a duck-typed local one, since internal/platform packages
// — unlike sibling domain packages — are meant to be imported directly (see
// internal/platform/mail, already imported the same way).
type Pusher interface {
	// Send delivers title/body/url to the subscription identified by
	// endpoint/p256dhKey/authKey (the three fields of a browser
	// PushSubscription). Returns ErrSubscriptionExpired if the push
	// service reports the subscription no longer exists.
	Send(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error
}

type WebPusher struct {
	vapidPublicKey, vapidPrivateKey, vapidSubject string
}

func NewWebPusher(vapidPublicKey, vapidPrivateKey, vapidSubject string) *WebPusher {
	return &WebPusher{
		vapidPublicKey:  vapidPublicKey,
		vapidPrivateKey: vapidPrivateKey,
		vapidSubject:    vapidSubject,
	}
}

type pushMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url,omitempty"`
}

func (p *WebPusher) Send(ctx context.Context, endpoint, p256dhKey, authKey, title, body, url string) error {
	// json.Marshal escapes quotes/control characters for us, so there's no
	// header-injection-style risk here the way there is building raw SMTP
	// headers (see internal/platform/mail's sanitizeAddress).
	message, err := json.Marshal(pushMessage{Title: title, Body: body, URL: url})
	if err != nil {
		return fmt.Errorf("encoding push message: %w", err)
	}

	sub := &webpush.Subscription{
		Endpoint: endpoint,
		Keys:     webpush.Keys{Auth: authKey, P256dh: p256dhKey},
	}
	resp, err := webpush.SendNotificationWithContext(ctx, message, sub, &webpush.Options{
		Subscriber:      p.vapidSubject,
		VAPIDPublicKey:  p.vapidPublicKey,
		VAPIDPrivateKey: p.vapidPrivateKey,
		TTL:             60 * 60 * 24, // a day — stale reminders aren't worth delivering later
	})
	if err != nil {
		return fmt.Errorf("sending push notification: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return ErrSubscriptionExpired
	}
	if resp.StatusCode >= 300 {
		return fmt.Errorf("push service responded with status %d", resp.StatusCode)
	}
	return nil
}
