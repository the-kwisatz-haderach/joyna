package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/alexedwards/scs/pgxstore"
	"github.com/alexedwards/scs/v2"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
	"github.com/the-kwisatz-haderach/joyna/internal/event"
	"github.com/the-kwisatz-haderach/joyna/internal/group"
	"github.com/the-kwisatz-haderach/joyna/internal/network"
	"github.com/the-kwisatz-haderach/joyna/internal/notification"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/db"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
)

func main() {
	dbCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cfg, err := config.Load()

	if err != nil {
		logging.Fatal("failed to load config", "error", err)
	}
	logging.New(cfg.AppEnv)

	pool, err := db.New(dbCtx, cfg.DatabaseURL)

	if err != nil {
		logging.Fatal("failed to initialize database", "error", err)
	}

	defer pool.Close()

	sessionManager := scs.New()
	sessionManager.Store = pgxstore.New(pool)

	sessionManager.Lifetime = 24 * time.Hour

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService, sessionManager)

	notificationRepo := notification.NewRepository(pool)
	notificationService := notification.NewService(notificationRepo)
	notificationHandler := notification.NewHandler(notificationService)

	eventRepo := event.NewRepository(pool)
	eventService := event.NewService(eventRepo, notificationService)
	eventHandler := event.NewHandler(eventService)

	groupRepo := group.NewRepository(pool)
	groupService := group.NewService(groupRepo)
	groupHandler := group.NewHandler(groupService)

	networkRepo := network.NewRepository(pool)
	networkService := network.NewService(networkRepo)
	networkHandler := network.NewHandler(networkService)

	mux := http.NewServeMux()

	// Lifecycle handlers
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	mux.HandleFunc("GET /ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	})

	// Auth handlers
	mux.HandleFunc("POST /auth/register", authHandler.Register)
	mux.HandleFunc("POST /auth/login", authHandler.Login)
	mux.HandleFunc("POST /auth/logout", authHandler.Logout)

	// Event handlers
	mux.HandleFunc("GET /events", authHandler.Middleware(eventHandler.GetEvents))
	mux.HandleFunc("POST /events", authHandler.Middleware(eventHandler.CreateEvent))
	mux.HandleFunc("GET /events/{id}", authHandler.Middleware(eventHandler.GetEvent))
	mux.HandleFunc("DELETE /events/{id}", authHandler.Middleware(eventHandler.DeleteEvent))
	mux.HandleFunc("PATCH /events/{id}", authHandler.Middleware(eventHandler.UpdateEvent))
	mux.HandleFunc("GET /events/{id}/attendees", authHandler.Middleware(eventHandler.GetEventAttendees))
	mux.HandleFunc("PATCH /events/{id}/invite", authHandler.Middleware(eventHandler.RespondToEventInvite))
	mux.HandleFunc("POST /events/invites", authHandler.Middleware(eventHandler.CreateEventInvite))
	mux.HandleFunc("DELETE /events/{id}/invites/{userId}", authHandler.Middleware(eventHandler.RemoveEventInvite))

	// Notification handlers
	mux.HandleFunc("GET /notifications", authHandler.Middleware(notificationHandler.ListNotifications))
	mux.HandleFunc("GET /notifications/unread-count", authHandler.Middleware(notificationHandler.GetUnreadCount))

	// Group handlers
	mux.HandleFunc("POST /groups", authHandler.Middleware(groupHandler.CreateGroup))
	mux.HandleFunc("PATCH /groups/{id}", authHandler.Middleware(groupHandler.UpdateGroup))
	mux.HandleFunc("DELETE /groups/{id}", authHandler.Middleware(groupHandler.DeleteGroup))

	// Network handlers
	mux.HandleFunc("GET /network", authHandler.Middleware(networkHandler.GetConnections))
	mux.HandleFunc("GET /network/potential", authHandler.Middleware(networkHandler.GetPotentialConnections))
	mux.HandleFunc("POST /network", authHandler.Middleware(networkHandler.CreateConnection))
	mux.HandleFunc("PATCH /network/{contactId}", authHandler.Middleware(networkHandler.UpdateConnection))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.AppPort),
		Handler: sessionManager.LoadAndSave(mux),
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("starting server", "port", cfg.AppPort)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logging.Fatal("server failed", "error", err)
		}
	}()

	go runDailyReminderScheduler(ctx, eventService)

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}

// runDailyReminderScheduler calls eventService.SendDailyReminders once a day
// at 08:00 server time, until ctx is cancelled. There's only ever one API
// replica (see joyna-app/templates/api-deployment.yaml), so an in-process
// ticker is enough here without risking duplicate sends across instances;
// the reminder queries themselves are also idempotent regardless.
func runDailyReminderScheduler(ctx context.Context, eventService *event.Service) {
	const reminderHour = 8

	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), reminderHour, 0, 0, 0, now.Location())
		if !next.After(now) {
			next = next.AddDate(0, 0, 1)
		}

		select {
		case <-time.After(time.Until(next)):
			if err := eventService.SendDailyReminders(ctx, time.Now()); err != nil {
				slog.Error("failed to send daily reminders", "error", err)
			}
		case <-ctx.Done():
			return
		}
	}
}
