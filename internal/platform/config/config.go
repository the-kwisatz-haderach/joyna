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
}

func Load() (*Config, error) {
	var cfg Config
	err := env.Parse(&cfg)
	return &cfg, err
}
