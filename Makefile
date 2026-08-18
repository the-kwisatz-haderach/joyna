ENV ?= development
-include .env
-include .env.$(ENV)
export

#  gcloud auth configure-docker <region>-docker.pkg.dev
TAG=$(git rev-parse --short HEAD)
REPO=$(GCP_CLOUD_REGION)-docker.pkg.dev/$(GCP_CLOUD_PROJECT_ID)/joyna

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

.PHONY: push-api-image
push-api-image:
	docker build -f Dockerfile -t $(REPO)/api:$(TAG) . && docker push $(REPO)/api:$(TAG)

.PHONY: push-migrations-image
push-migrations-image:
	docker build -f Dockerfile.migrate -t $(REPO)/migrate:$(TAG) . && docker push $(REPO)/migrate:$(TAG)
