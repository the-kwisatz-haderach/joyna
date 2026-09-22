// Command notifier sends the daily, time-based event reminders (RSVP
// deadline tomorrow, event starting today) and exits. It's meant to be run
// on a schedule by an external scheduler (a Kubernetes CronJob in
// production; see joyna-app/templates/notifier-cronjob.yaml) rather than
// live inside the long-running api process, so the reminders don't depend
// on any particular api replica staying up at the moment they're due.
package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/the-kwisatz-haderach/joyna/internal/event"
	"github.com/the-kwisatz-haderach/joyna/internal/notification"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/db"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/push"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		logging.Fatal("failed to load config", "error", err)
	}
	logging.New(cfg.AppEnv)

	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logging.Fatal("failed to initialize database", "error", err)
	}
	defer pool.Close()

	pusher := push.NewWebPusher(cfg.VAPIDPublicKey, cfg.VAPIDPrivateKey, cfg.VAPIDSubject)

	notificationRepo := notification.NewRepository(pool)
	notificationService := notification.NewService(notificationRepo, pusher, cfg.VAPIDPublicKey)

	eventRepo := event.NewRepository(pool)
	eventService := event.NewService(eventRepo, notificationService)

	if err := eventService.SendDailyReminders(ctx, time.Now()); err != nil {
		logging.Fatal("failed to send daily reminders", "error", err)
	}

	slog.Info("daily reminders sent")
}
