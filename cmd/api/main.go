package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
	"github.com/the-kwisatz-haderach/joyna/internal/event"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/db"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
)

func main() {
	ctx := context.Background()
	cfg, err := config.Load()

	if err != nil {
		logging.Fatal("failed to load config", err)
	}
	logging.New(cfg.AppEnv)

	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logging.Fatal("failed to initialize database", err)
	}

	sessionManager := scs.New()
	sessionManager.Lifetime = 24 * time.Hour

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService, sessionManager)

	eventRepo := event.NewRepository(pool)
	eventService := event.NewService(eventRepo)
	eventHandler := event.NewHandler(eventService)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
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

	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", cfg.AppPort), sessionManager.LoadAndSave(mux)))
}
