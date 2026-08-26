ENV ?= development
-include .env
-include .env.$(ENV)
export

DATABASE_URL ?= postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable
export DATABASE_URL

TAG=$(shell git rev-parse --short HEAD)
export TAG

REPO=$(GCP_CLOUD_REGION)-docker.pkg.dev/$(GCP_CLOUD_PROJECT_ID)/joyna
export REPO

CHART_DIR := joyna-app
RELEASE := joyna
NAMESPACE := joyna
HELM_VALUES := -f $(CHART_DIR)/values.secret.yaml \
	--set api.image.tag=$(TAG) \
	--set migrate.image.tag=$(TAG) \
	--set frontend.image.tag=$(TAG)

# Creates new db migration following correct sequence.
.PHONY: migrate-create
migrate-create:
	@migrate create -ext sql -dir migrations -seq $(name)

# Run all UP migrations.
.PHONY: migrate-up
migrate-up:
	@migrate -path ./migrations -database "$(DATABASE_URL)" up

# Run all DOWN migrations.
.PHONY: migrate-down
migrate-down:
	@migrate -path ./migrations -database "$(DATABASE_URL)" down

.PHONY: integration-tests
integration-tests:
	go test ./... -tags=integration

.PHONY: build-api
build-api:
	go build ./cmd/api/main.go

.PHONY: run-api
run-api:
	go run ./cmd/api/main.go

.PHONY: push-api-image
push-api-image:
	docker build -f Dockerfile -t $(REPO)/api:$(TAG) . && docker push $(REPO)/api:$(TAG)
	@echo "Image pushed: $(REPO)/api:$(TAG)"

.PHONY: push-migrations-image
push-migrations-image:
	docker build -f Dockerfile.migrate -t $(REPO)/migrate:$(TAG) . && docker push $(REPO)/migrate:$(TAG)
	@echo "Image pushed: $(REPO)/migrate:$(TAG)"

.PHONY: push-frontend-image
push-frontend-image:
	docker build -f frontend/Dockerfile -t $(REPO)/frontend:$(TAG) frontend && docker push $(REPO)/frontend:$(TAG)
	@echo "Image pushed: $(REPO)/frontend:$(TAG)"

.PHONY: helm-lint
helm-lint:
	helm lint $(CHART_DIR) $(HELM_VALUES)

.PHONY: helm-template
helm-template:
	helm template $(RELEASE) $(CHART_DIR) $(HELM_VALUES)

.PHONY: helm-diff
helm-diff:
	helm template $(RELEASE) $(CHART_DIR) $(HELM_VALUES) | kubectl diff -n $(NAMESPACE) -f -

.PHONY: helm-upgrade
helm-upgrade:
	helm upgrade --install $(RELEASE) $(CHART_DIR) \
		--namespace $(NAMESPACE) --create-namespace \
		$(HELM_VALUES) \
		--wait --timeout 5m

.PHONY: helm-undeploy
helm-undeploy:
	helm uninstall $(RELEASE) --namespace $(NAMESPACE)