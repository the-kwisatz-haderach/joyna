# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This app is part of a project where users can create, view, update and share events to their network. Events can be forwarded by the invited users to their networks. Users can view upcoming and past events as well as connect with attendees from past events. Users can also group members of their network.

This project is a Go web server which handles the different actions taken by users in a separate frontend app.
The database used is PostgreSQL, which is updated through migrations found in /migrations.

Example domains which can be used as templates for future development: `internal/auth` (registration/login/session), `internal/event` (create/update/delete).

## Architecture

Each domain lives in `internal/<domain>/` with (at least) four files:

- `model.go` — domain types (e.g. `Event`) and any type that needs to flow through more than one layer
  (e.g. `EventUpdate`, since both the handler and repository touch it). Request/response DTOs that are
  decoded/encoded only within a single handler (e.g. `createEventRequest`) stay local to `handler.go` instead.
- `repository.go` — the only layer that imports `pgx`. Translates driver/constraint errors into exported
  sentinel errors (`ErrEventNotFound`, `ErrUserAlreadyExists`, ...); never returns raw pgx/pg errors to callers.
- `service.go` — business rules (e.g. event date validation). Depends on an unexported `repository` interface
  (not the concrete `*Repository`) so it's mockable in tests. No knowledge of HTTP.
- `handler.go` — the only layer allowed to know about HTTP status codes. Maps sentinel errors to responses via
  `errors.Is`/`errors.As`; anything unrecognized becomes a generic `500` (never leak `err.Error()` to the client).

`cmd/api/main.go` is the composition root: it constructs `config` → `logging` → `db.Pool` → each domain's
`Repository`/`Service`/`Handler`, then wires routes. Dependencies are passed explicitly through constructors;
the one deliberate exception is the logger (`logging.New` calls `slog.SetDefault`, so any file can call
top-level `slog.Info`/`slog.Error` without importing the `logging` package).

## Routing & auth

- Stdlib `net/http.ServeMux` only (Go 1.22+ method+path patterns, e.g. `"POST /events"`, `"DELETE /events/{id}"`
  read via `r.PathValue("id")`) — no router package.
- Auth is session-cookie based (`alexedwards/scs`), not JWT. `authHandler.Middleware` gates protected routes and
  stashes the user ID on the request context; every other package reads it via `auth.UserIDFromContext(ctx)` and
  never touches `scs`/`sessionManager` directly. Wire a protected route as:
  `mux.Handle("POST /events", authHandler.Middleware(eventHandler.CreateEvent))`.

## Data conventions

- IDs and creation timestamps are DB-generated (`DEFAULT gen_random_uuid()` / `DEFAULT NOW()`), read back via
  `RETURNING`, never pre-generated in Go. Client-facing "create" DTOs simply have no `id`/`createdAt` field —
  making the invalid state unrepresentable rather than validating against it.
- Timestamps are `time.Time` (`*time.Time` when the column is nullable), never strings — this gets RFC3339
  parsing/validation for free from `encoding/json`.
- Partial updates (`PATCH`) use pointer-typed fields (`*string`, `*time.Time`, ...) so "omitted" (`nil`) is
  distinguishable from "explicitly cleared". Apply them with SQL `COALESCE($n, column)` in a single query rather
  than a read-modify-write round trip.
- Constraint violations are detected via `errors.As(err, &pgErr)` against `*pgconn.PgError` and its `.Code`
  (SQLSTATE, e.g. `"23505"` unique_violation), translated into a sentinel in the repository layer.

## Local dev

- `docker compose up -d` runs `api`, `db`, `migrate` (one-shot, gated on `db`'s healthcheck), and `pgadmin`.
- Config comes from `.env` (gitignored); keep `.env.example` in sync when adding new variables.
- `requests/*.http` holds example API calls for manual testing (VS Code REST Client extension) — prefer extending these over ad hoc curl commands when adding new endpoints.
