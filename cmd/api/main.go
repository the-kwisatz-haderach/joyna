package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

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

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", cfg.AppPort), mux))
}
