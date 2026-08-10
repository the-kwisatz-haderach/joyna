package logging

import (
	"log/slog"
	"os"
)

func New() *slog.Logger {
	var logHandler slog.Handler

	if os.Getenv("APP_ENV") == "production" {
		logHandler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		logHandler = slog.NewTextHandler(os.Stderr, nil)
	}

	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	return logger
}
