package push

import (
	"context"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/golang-jwt/jwt/v5"
)

func TestSendVAPIDSubjectClaim(t *testing.T) {
	priv, pub, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatalf("generating VAPID keys: %v", err)
	}

	var gotSub string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		tokenStr := strings.TrimPrefix(strings.SplitN(auth, ",", 2)[0], "vapid t=")

		claims := jwt.MapClaims{}
		parser := jwt.NewParser()
		if _, _, err := parser.ParseUnverified(tokenStr, claims); err != nil {
			t.Errorf("parsing VAPID JWT: %v", err)
		}
		sub, _ := claims["sub"].(string)
		gotSub = sub

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	pusher := NewWebPusher(pub, priv, "mailto:joyna@mogva.dev")

	// The p256dh key must be a valid point on the P-256 curve — webpush-go
	// derives an ECDH shared secret from it before it ever gets to encoding
	// the payload, so an arbitrary byte string (even the right length) fails
	// before this test can observe the VAPID header at all.
	subscriberKey, err := ecdh.P256().GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generating subscriber key: %v", err)
	}
	p256dh := base64.RawURLEncoding.EncodeToString(subscriberKey.PublicKey().Bytes())
	authKey := base64.RawURLEncoding.EncodeToString(make([]byte, 16))

	err = pusher.Send(context.Background(), server.URL, p256dh, authKey, "title", "body", "")
	if err != nil {
		t.Fatalf("Send() returned error: %v", err)
	}

	if gotSub != "mailto:joyna@mogva.dev" {
		t.Errorf("sub claim = %q, want %q (VAPIDSubject must not be double-prefixed with mailto:)", gotSub, "mailto:joyna@mogva.dev")
	}
}
