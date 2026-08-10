package main

import (
	"log"
	"net/http"

	"github.com/the-kwisatz-haderach/joyna/internal/platform/logging"
)

func main() {
	logging.New()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	log.Fatal(http.ListenAndServe(":8080", mux))
}
