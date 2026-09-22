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
