ENV ?= development
-include .env
-include .env.$(env)
export

# Creates new db migration following correct sequence.
.PHONY: migrate-create
migrate-create:
	@migrate create -ext sql -dir migrations -seq $(name)

# Run all UP migrations.
.PHONY: migrate-up
migrate-up:
	@migrate -path ./migrations -database "postgres://$(POSTGRES_DB):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/postgres?sslmode=disable" up

# Run all DOWN migrations.
.PHONY: migrate-down
migrate-down:
	@migrate -path ./migrations -database "postgres://$(POSTGRES_DB):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/postgres?sslmode=disable" down

.PHONY: integration-tests
integration-tests:
	go test ./... -tags=integration

.PHONY: build-api
build-api:
	go build ./cmd/api/main.go