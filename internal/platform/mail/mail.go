// Package mail sends transactional email over plain SMTP. It's intentionally
// provider-agnostic (no vendor SDK) — point it at Gmail's app-password relay,
// SES's SMTP endpoint, Mailgun, Postmark, or any other SMTP relay via config.
package mail

import (
	"context"
	"fmt"
	"mime"
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

	safeFrom, err := sanitizeAddress(m.from)
	if err != nil {
		return fmt.Errorf("invalid from address: %w", err)
	}
	safeTo, err := sanitizeAddress(to)
	if err != nil {
		return fmt.Errorf("invalid to address: %w", err)
	}
	// Q-encoding maps its input onto a fixed, CR/LF-free ASCII alphabet
	// (RFC 2047 encoded-word), so unlike stripping/rejecting characters
	// after the fact, header injection via subject is structurally
	// impossible regardless of what it contains.
	safeSubject := mime.QEncoding.Encode("UTF-8", subject)
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

// sanitizeAddress validates v as a single RFC 5322 address with no display
// name, and returns the parser's own canonical rendering of it rather than
// the raw input — so the bytes that reach the header/envelope are always
// mail.ParseAddress's output, never attacker-controlled text.
func sanitizeAddress(v string) (string, error) {
	parsed, err := mail.ParseAddress(strings.TrimSpace(v))
	if err != nil {
		return "", err
	}
	if parsed.Address == "" || parsed.Name != "" {
		return "", fmt.Errorf("unsupported address format")
	}
	return parsed.Address, nil
}
