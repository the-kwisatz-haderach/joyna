package logging

import (
	"log/slog"
	"os"
)

func New(appEnv string) *slog.Logger {
	var logHandler slog.Handler

	if appEnv == "production" {
		logHandler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		logHandler = slog.NewTextHandler(os.Stderr, nil)
	}

	logger := slog.New(logHandler)
	slog.SetDefault(logger)

	return logger
}

func Fatal(msg string, args ...any) {
	slog.Error(msg, args...)
	os.Exit(1)
}
