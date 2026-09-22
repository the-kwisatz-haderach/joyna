// Package mail sends transactional email over plain SMTP. It's intentionally
// provider-agnostic (no vendor SDK) — point it at Gmail's app-password relay,
// SES's SMTP endpoint, Mailgun, Postmark, or any other SMTP relay via config.
package mail

import (
	"context"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"strings"
)

// Mailer sends a single plain-text email. Domains that need to send mail
// depend on this interface (see internal/network's unexported `mailer`
// field) rather than importing this package directly, matching this
// codebase's existing pattern for optional cross-domain capabilities (see
// internal/event's `notifier` interface).
type Mailer interface {
	Send(ctx context.Context, to, subject, body string) error
}

// SMTPMailer sends mail via net/smtp. Auth is skipped (nil) when user is
// empty, so it also works against relays that don't require it (e.g. a
// local dev catcher).
type SMTPMailer struct {
	host, port, user, password, from string
}

func NewSMTPMailer(host, port, user, password, from string) *SMTPMailer {
	return &SMTPMailer{host: host, port: port, user: user, password: password, from: from}
}

// Send blocks on the underlying net/smtp.SendMail call, which has no
// context support — ctx is accepted for interface consistency and future
// use (e.g. a provider-API-based Mailer that does support cancellation),
// but isn't honored here.
func (m *SMTPMailer) Send(ctx context.Context, to, subject, body string) error {
	addr := net.JoinHostPort(m.host, m.port)

	var auth smtp.Auth
	if m.user != "" {
		auth = smtp.PlainAuth("", m.user, m.password, m.host)
	}

	safeFrom, err := sanitizeHeaderValue(m.from, "from")
	if err != nil {
		return err
	}
	safeTo, err := sanitizeHeaderValue(to, "to")
	if err != nil {
		return err
	}
	parsedTo, err := mail.ParseAddress(safeTo)
	if err != nil || parsedTo == nil || parsedTo.Address == "" || parsedTo.Name != "" {
		return fmt.Errorf("invalid to header value")
	}
	safeTo = parsedTo.Address
	safeSubject, err := sanitizeHeaderValue(subject, "subject")
	if err != nil {
		return err
	}
	safeBody := strings.ReplaceAll(body, "\r", "")

	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s\r\n",
		safeFrom, safeTo, safeSubject, safeBody,
	)

	if err := smtp.SendMail(addr, auth, safeFrom, []string{safeTo}, []byte(msg)); err != nil {
		return fmt.Errorf("sending mail via smtp: %w", err)
	}
	return nil
}

func sanitizeHeaderValue(v, field string) (string, error) {
	v = strings.TrimSpace(v)
	if v == "" {
		return "", fmt.Errorf("invalid %s header value: empty", field)
	}
	for _, r := range v {
		if r == '\r' || r == '\n' || (r < 32 && r != '\t') || r == 127 {
			return "", fmt.Errorf("invalid %s header value", field)
		}
	}
	return v, nil
}
