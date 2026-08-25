---
name: Backend issue
about: Report a bug or request a feature for the Go API server (internal/, cmd/)
title: ''
labels: backend
assignees: ''
---

## Description

<!-- Describe the functionality to be built or the bug to be fixed. -->

## Database migrations

- [ ] N/A — no schema changes
- [ ] New migration added in `/migrations` (`make migrate-create name=...`), and `make migrate-up` / `make migrate-down` both run cleanly

## Testing

- [ ] Unit tests added/updated covering the new functionality (`internal/<domain>/*_test.go`)
- [ ] Integration tests added/updated covering new repository functionality (`internal/<domain>/repository_test.go`, run via `make integration-tests`)

## API schema

- [ ] N/A — no API surface changes
- [ ] `openapi.yaml` updated to reflect new/changed endpoints

## Additional context

<!-- Links to related issues, discussions, or designs. -->
