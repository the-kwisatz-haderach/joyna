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
	"github.com/the-kwisatz-haderach/joyna/internal/eventtemplate"
	"github.com/the-kwisatz-haderach/joyna/internal/group"
	"github.com/the-kwisatz-haderach/joyna/internal/network"
	"github.com/the-kwisatz-haderach/joyna/internal/notification"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/db"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/mail"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/push"
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
	sessionManager.Cookie.Secure = cfg.CookieSecure

	mailer := mail.NewSMTPMailer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPFrom)

	networkRepo := network.NewRepository(pool)
	networkService := network.NewService(networkRepo, mailer, cfg.FrontendURL)
	networkHandler := network.NewHandler(networkService)

	templateRepo := eventtemplate.NewRepository(pool)
	templateService := eventtemplate.NewService(templateRepo)
	templateHandler := eventtemplate.NewHandler(templateService)

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo, networkService, templateService)
	authHandler := auth.NewHandler(authService, sessionManager)

	pusher := push.NewWebPusher(cfg.VAPIDPublicKey, cfg.VAPIDPrivateKey, cfg.VAPIDSubject)

	notificationRepo := notification.NewRepository(pool)
	notificationService := notification.NewService(notificationRepo, pusher, cfg.VAPIDPublicKey)
	notificationHandler := notification.NewHandler(notificationService)

	eventRepo := event.NewRepository(pool)
	eventService := event.NewService(eventRepo, notificationService)
	eventHandler := event.NewHandler(eventService)

	groupRepo := group.NewRepository(pool)
	groupService := group.NewService(groupRepo)
	groupHandler := group.NewHandler(groupService)

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
	mux.HandleFunc("PATCH /me", authHandler.Middleware(authHandler.UpdateUser))

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

	// Event template handlers
	mux.HandleFunc("GET /event-templates", authHandler.Middleware(templateHandler.GetTemplates))
	mux.HandleFunc("POST /event-templates", authHandler.Middleware(templateHandler.CreateTemplate))
	mux.HandleFunc("PATCH /event-templates/{id}", authHandler.Middleware(templateHandler.UpdateTemplate))
	mux.HandleFunc("DELETE /event-templates/{id}", authHandler.Middleware(templateHandler.DeleteTemplate))

	// Notification handlers
	mux.HandleFunc("GET /notifications", authHandler.Middleware(notificationHandler.ListNotifications))
	mux.HandleFunc("GET /notifications/unread-count", authHandler.Middleware(notificationHandler.GetUnreadCount))
	mux.HandleFunc("POST /push-subscriptions", authHandler.Middleware(notificationHandler.SubscribeToPush))
	mux.HandleFunc("DELETE /push-subscriptions", authHandler.Middleware(notificationHandler.UnsubscribeFromPush))
	mux.HandleFunc("GET /push-subscriptions/vapid-public-key", authHandler.Middleware(notificationHandler.GetVAPIDPublicKey))

	// Group handlers
	mux.HandleFunc("GET /groups", authHandler.Middleware(groupHandler.GetGroups))
	mux.HandleFunc("POST /groups", authHandler.Middleware(groupHandler.CreateGroup))
	mux.HandleFunc("PATCH /groups/{id}", authHandler.Middleware(groupHandler.UpdateGroup))
	mux.HandleFunc("DELETE /groups/{id}", authHandler.Middleware(groupHandler.DeleteGroup))

	// Network handlers
	mux.HandleFunc("GET /network", authHandler.Middleware(networkHandler.GetConnections))
	mux.HandleFunc("GET /network/potential", authHandler.Middleware(networkHandler.GetPotentialConnections))
	mux.HandleFunc("GET /network/lookup", authHandler.Middleware(networkHandler.LookupUserByEmail))
	mux.HandleFunc("POST /network/invite", authHandler.Middleware(networkHandler.InviteByEmail))
	mux.HandleFunc("POST /network", authHandler.Middleware(networkHandler.CreateConnection))
	mux.HandleFunc("PATCH /network/{contactId}", authHandler.Middleware(networkHandler.UpdateConnection))
	mux.HandleFunc("DELETE /network/{contactId}", authHandler.Middleware(networkHandler.DeleteConnection))

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.AppPort),
		Handler: sessionManager.LoadAndSave(mux),
	}

	go func() {
		slog.Info("starting server", "port", cfg.AppPort)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logging.Fatal("server failed", "error", err)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
	}
}
