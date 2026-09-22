package mail

import (
	"bufio"
	"context"
	"net"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSanitizeAddress(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    string
		wantErr bool
	}{
		{name: "plain address", in: "user@example.com", want: "user@example.com"},
		{name: "trims surrounding whitespace", in: "  user@example.com  ", want: "user@example.com"},
		{name: "rejects display name", in: "Attacker <user@example.com>", wantErr: true},
		{name: "rejects embedded CRLF header injection attempt", in: "user@example.com\r\nBcc: attacker@evil.com", wantErr: true},
		{name: "rejects malformed address", in: "not-an-address", wantErr: true},
		{name: "rejects empty string", in: "", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := sanitizeAddress(tt.in)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tt.want, got)
		})
	}
}

func TestSend_RejectsInvalidAddressesBeforeDialing(t *testing.T) {
	// Port 0 with no listener guarantees a dial error if Send ever reaches
	// net/smtp; a successful early return with an error proves rejection
	// happened during address validation instead.
	m := NewSMTPMailer("127.0.0.1", "0", "", "", "sender@example.com")

	err := m.Send(context.Background(), "victim@example.com\r\nBcc: attacker@evil.com", "subject", "body")
	require.ErrorContains(t, err, "invalid to address")

	m = NewSMTPMailer("127.0.0.1", "0", "", "", "sender@example.com\r\nBcc: attacker@evil.com")
	err = m.Send(context.Background(), "victim@example.com", "subject", "body")
	require.ErrorContains(t, err, "invalid from address")
}

func TestSend_NeutralizesSubjectHeaderInjectionAttempt(t *testing.T) {
	srv := startFakeSMTPServer(t)

	host, port, err := net.SplitHostPort(srv.Addr().String())
	require.NoError(t, err)

	m := NewSMTPMailer(host, port, "", "", "sender@example.com")

	maliciousSubject := "Hi\r\nBcc: attacker@evil.com\r\nX-Injected: true"
	err = m.Send(context.Background(), "victim@example.com", maliciousSubject, "hello there")
	require.NoError(t, err)

	raw := srv.lastMessage(t)
	headerBlock, _, found := strings.Cut(raw, "\r\n\r\n")
	require.True(t, found, "message should contain a blank line separating headers from body")

	headerLines := strings.Split(headerBlock, "\r\n")
	require.Len(t, headerLines, 4, "no extra headers should have been injected: %q", headerBlock)
	for _, line := range headerLines {
		require.False(t, strings.HasPrefix(line, "Bcc:"), "attacker-controlled Bcc header leaked into the message: %q", line)
		require.False(t, strings.HasPrefix(line, "X-Injected:"), "attacker-controlled header leaked into the message: %q", line)
	}
	require.Contains(t, headerBlock, "Subject: =?UTF-8?q?")
}

// fakeSMTPServer is a minimal SMTP server, just enough to accept a
// net/smtp.SendMail exchange and capture the raw DATA payload, so tests can
// assert on exactly what bytes would have reached a real relay.
type fakeSMTPServer struct {
	ln   net.Listener
	msgs chan string
}

func startFakeSMTPServer(t *testing.T) *fakeSMTPServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { ln.Close() })

	s := &fakeSMTPServer{ln: ln, msgs: make(chan string, 1)}
	go s.serve()
	return s
}

func (s *fakeSMTPServer) Addr() net.Addr {
	return s.ln.Addr()
}

func (s *fakeSMTPServer) lastMessage(t *testing.T) string {
	t.Helper()
	select {
	case msg := <-s.msgs:
		return msg
	default:
		t.Fatal("no message received by fake SMTP server")
		return ""
	}
}

func (s *fakeSMTPServer) serve() {
	for {
		conn, err := s.ln.Accept()
		if err != nil {
			return
		}
		go s.handle(conn)
	}
}

func (s *fakeSMTPServer) handle(conn net.Conn) {
	defer conn.Close()
	reader := bufio.NewReader(conn)
	reply := func(line string) { conn.Write([]byte(line + "\r\n")) }

	reply("220 fake.smtp ESMTP")
	var inData bool
	var data strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}
		trimmed := strings.TrimRight(line, "\r\n")

		if inData {
			if trimmed == "." {
				inData = false
				s.msgs <- data.String()
				reply("250 OK")
				continue
			}
			data.WriteString(strings.TrimPrefix(trimmed, ".") + "\r\n")
			continue
		}

		switch {
		case strings.HasPrefix(trimmed, "EHLO"), strings.HasPrefix(trimmed, "HELO"):
			reply("250 fake.smtp")
		case strings.HasPrefix(trimmed, "MAIL FROM"):
			reply("250 OK")
		case strings.HasPrefix(trimmed, "RCPT TO"):
			reply("250 OK")
		case trimmed == "DATA":
			inData = true
			data.Reset()
			reply("354 End data with <CR><LF>.<CR><LF>")
		case trimmed == "QUIT":
			reply("221 Bye")
			return
		default:
			reply("500 unrecognized command")
		}
	}
}
