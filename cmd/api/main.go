package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/alexedwards/scs/v2"
	"github.com/the-kwisatz-haderach/joyna/internal/auth"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/config"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/db"
	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
)

func main() {
	ctx := context.Background()
	cfg, err := config.Load()

	if err != nil {
		log.Fatal(err)
	}
	logging.New(cfg.AppEnv)

	pool, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}

	sessionManager := scs.New()
	sessionManager.Lifetime = 24 * time.Hour

	authRepo := auth.NewRepository(pool)
	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService, sessionManager)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Auth handlers
	mux.HandleFunc("POST /auth/register", authHandler.Register)
	mux.HandleFunc("POST /auth/login", authHandler.Login)
	mux.HandleFunc("POST /auth/logout", authHandler.Logout)

	// Event handlers

	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", cfg.AppPort), sessionManager.LoadAndSave(mux)))
}
