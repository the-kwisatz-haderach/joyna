package config

import (
	"github.com/caarlos0/env/v11"
)

type Config struct {
	AppPort     int    `env:"APP_PORT" envDefault:"8080"`
	AppEnv      string `env:"APP_ENV" envDefault:"development"`
	DatabaseURL string `env:"DATABASE_URL,required"`

	// SMTP_* configure the mailer used for network-invite emails (see
	// internal/platform/mail). Left optional (not `required`) so the rest
	// of the app still boots in environments where email isn't configured
	// yet — InviteByEmail will simply fail until it is.
	SMTPHost     string `env:"SMTP_HOST"`
	SMTPPort     string `env:"SMTP_PORT" envDefault:"587"`
	SMTPUser     string `env:"SMTP_USER"`
	SMTPPassword string `env:"SMTP_PASSWORD"`
	SMTPFrom     string `env:"SMTP_FROM" envDefault:"joyna@joyna.dev"`

	// FrontendURL builds the registration link sent in invite emails.
	FrontendURL string `env:"FRONTEND_URL" envDefault:"http://localhost:5173"`

	// CookieSecure marks the session cookie Secure (HTTPS-only). Defaults
	// to false so local dev (plain HTTP) keeps working; deployed
	// environments set COOKIE_SECURE=true via the Helm chart once they're
	// served over HTTPS. Not tied to AppEnv — the api process never
	// terminates TLS itself (the Gateway does) and can't infer this from
	// its own listening socket, and AppEnv=development is also what the
	// deployed dev environment runs today, so it can't be reused for this.
	CookieSecure bool `env:"COOKIE_SECURE" envDefault:"false"`

	// VAPID_* configure web push notifications (see internal/platform/push).
	// Optional, same reasoning as SMTP_* — the app boots without them, push
	// just doesn't send until they're set. Generate a keypair once with
	// `npx web-push generate-vapid-keys` (or equivalent); VAPIDSubject is a
	// mailto: contact URI required by the VAPID spec.
	VAPIDPublicKey  string `env:"VAPID_PUBLIC_KEY"`
	VAPIDPrivateKey string `env:"VAPID_PRIVATE_KEY"`
	VAPIDSubject    string `env:"VAPID_SUBJECT" envDefault:"mailto:joyna@joyna.dev"`
}

func Load() (*Config, error) {
	var cfg Config
	err := env.Parse(&cfg)
	return &cfg, err
}
