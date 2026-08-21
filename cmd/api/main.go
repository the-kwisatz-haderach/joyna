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

	"github.com/alexedwards/scs/v2"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
	"github.com/the-kwisatz-haderach/joyna/internal/event"
	"github.com/the-kwisatz-haderach/joyna/internal/group"
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
	sessionManager.Lifetime = 24 * time.Hour

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService, sessionManager)

	eventRepo := event.NewRepository(pool)
	eventService := event.NewService(eventRepo)
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

	// Event handlers
	mux.HandleFunc("GET /events", authHandler.Middleware(eventHandler.GetEvents))
	mux.HandleFunc("POST /events", authHandler.Middleware(eventHandler.CreateEvent))
	mux.HandleFunc("DELETE /events/{id}", authHandler.Middleware(eventHandler.DeleteEvent))
	mux.HandleFunc("PATCH /events/{id}", authHandler.Middleware(eventHandler.UpdateEvent))
	mux.HandleFunc("POST /events/invites", authHandler.Middleware(eventHandler.CreateEventInvite))

	// Group handlers
	mux.HandleFunc("POST /groups", authHandler.Middleware(groupHandler.CreateGroup))
	mux.HandleFunc("PATCH /groups/{id}", authHandler.Middleware(groupHandler.UpdateGroup))
	mux.HandleFunc("DELETE /groups/{id}", authHandler.Middleware(groupHandler.DeleteGroup))

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
