package config

import (
	"github.com/caarlos0/env/v11"
)

type Config struct {
	AppPort     int    `env:"APP_PORT" envDefault:"8080"`
	AppEnv      string `env:"APP_ENV" envDefault:"development"`
	DatabaseURL string `env:"DATABASE_URL,required"`
}

func Load() (*Config, error) {
	var cfg Config
	err := env.Parse(&cfg)
	return &cfg, err
}
