# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This app is part of a project where users can create, view, update and share events to their network. Events can be forwarded by the invited users to their networks. Users can view upcoming and past events as well as connect with attendees from past events. Users can also group members of their network.

This project is a Go web server which handles the different actions taken by users in a separate frontend app,
which lives in this same repo under `frontend/` (a monorepo, not a submodule — own toolchain, own `package.json`,
doesn't touch `go.mod`). See "Frontend" below for its stack and conventions.
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

## Testing

- **Unit tests** live in `internal/<domain>/*_test.go`, package `<domain>` (not `<domain>_test`) so they can use
  unexported identifiers directly. No mocking library — `service_test.go` hand-rolls a `fakeRepository` struct
  with one function field per method of the unexported `repository` interface; each test sets only the fields it
  needs. This works because `NewService` takes the interface, not the concrete `*Repository`.
- **Integration tests** live in `internal/<domain>/repository_test.go` (same co-location rule) and hit a real,
  ephemeral Postgres via `testcontainers-go`. Gated behind `//go:build integration` (plus the legacy
  `// +build integration` line and a blank line before `package`) so `go test ./...` skips them by default;
  `make integration-tests` (`go test ./... -tags=integration`) includes them. Bootstrapping is shared via
  `internal/platform/dbtest` (`InitTestContainer`, `NewPoolWithMigrations` — runs every `migrations/*.up.sql` in
  order against the container). Call `testcontainers.CleanupContainer(t, pgContainer)` immediately after creating
  the container and _before_ checking its error, not a manual `defer` — that ordering registers cleanup even on
  partial failure, and a `defer` inside a helper function (rather than the test itself) only fires at the end of
  that helper, not the end of the test.
- **Cross-package test fixtures** (e.g. `event`'s tests needing a real user row for the `owner_id` FK) live in a
  `<domain>test` sibling package, e.g. `internal/auth/authtest`, exported and importable from other packages'
  tests — unlike a plain `_test.go` file, whose contents aren't importable outside their own package. Fixture
  helpers go through the real repository method (e.g. `authtest.CreateUser` calls `auth.Repository.CreateUser`)
  rather than raw SQL, so they can't silently drift from the real insert logic as the schema evolves.

## Makefile

- `make build-api` — `go build` the API binary.
- `make migrate-create name=...` / `make migrate-up` / `make migrate-down` — golang-migrate against `/migrations`.
- `make integration-tests` — see Testing above. Plain `go test ./...` (no Makefile target yet) runs unit tests only.

## Frontend

`frontend/` is a Vite + React 19 + TypeScript app, scaffolded via `npm create vite@latest -- --template react-ts`.
It's a separate toolchain from the Go side — no shared build step, no path from `internal/`/`cmd/` into it.

- **Component library: shadcn/ui** (`components.json`: style `base-mira`, base color `mist`, icon library
  `hugeicons`). Components are not an installed dependency you import from `node_modules` — the shadcn CLI copies
  component source directly into the repo (`npx shadcn@latest add <component>`, landing in `components/ui/`), so
  they're yours to read/edit directly like any other source file. Built on Tailwind CSS v4 (`@tailwindcss/vite`
  plugin — no separate `tailwind.config.*`, Tailwind v4 is configured via CSS) and Radix-style primitives via
  `@base-ui/react`.
- **Theming is CSS custom properties, not a JS theme object** — all theme tokens (`--text`, `--bg`, `--accent`,
  `--border`, ...) live in `:root` in `src/index.css`. Retheming means editing values there, not passing a
  `theme` prop through a provider.
- **Path alias `@/*`** resolves to the `frontend/` root (`tsconfig.json` + `components.json` aliases agree):
  `@/components`, `@/components/ui`, `@/lib` (→ `lib/utils.ts`), `@/hooks` (not yet used). Note `components/`
  and `lib/` sit at the `frontend/` root, not under `src/` — that's shadcn's default layout for this config,
  keep new shadcn-generated files following the same placement.
- **Routing: `react-router`** (`createBrowserRouter`/`RouterProvider`, wired in `src/main.tsx`). Route config lives
  in `src/router.tsx`; page components live in `src/routes/` (e.g. `landing.tsx`, `login.tsx`, `register.tsx`),
  nested under a shared `root-layout.tsx` (nav + `Outlet`). Prefer relative imports within `src/` (matching
  `main.tsx`'s existing style) and reserve the `@/*` alias for cross-cutting shared modules like
  `@/components/ui/*`.
- **API mocking: MSW** (`msw`, `src/mocks/`). `handlers.ts` mirrors the Go API's auth/event/group endpoints against
  in-memory fixture data from `data.ts` (mutable module-level copies, reset on reload — not persisted). Gated
  behind `VITE_API_MOCKING=enabled` (checked in `main.tsx` before the app renders, and declared in
  `vite-env.d.ts`); `npm run dev:mock` runs the dev server with mocking on, plain `npm run dev` talks to the real
  backend. `browser.ts`/`node.ts` are separate `setupWorker`/`setupServer` entry points sharing the same
  `handlers.ts` — use `node.ts` for tests, `browser.ts` is what `main.tsx` imports. The
  `postinstall` script (`msw init public --save`) regenerates `public/mockServiceWorker.js` after every
  `npm install`; that generated file is gitignored, don't hand-edit or commit it.
- **Scripts** (`frontend/package.json`): `dev`, `dev:mock` (dev server + MSW), `build` (`tsc -b && vite build`),
  `typecheck` (`tsc -b` alone — safe to run standalone since `tsconfig.app.json` sets `noEmit: true`), `lint`
  (`oxlint` — not ESLint; Vite's current scaffold default), `preview`.
- **CI**: `.github/workflows/fe-check.yml` runs typecheck → lint → build, gated behind a `dorny/paths-filter`
  check so it only actually runs when a push/PR touches `frontend/**` (unlike `check.yml`, this isn't yet wired
  as a required status check in branch protection).

## Local dev

- `docker compose up -d` runs `api`, `db`, `migrate` (one-shot, gated on `db`'s healthcheck), and `pgadmin`.
- Config comes from `.env` (gitignored); keep `.env.example` in sync when adding new variables.
- `requests/*.http` holds example API calls for manual testing (VS Code REST Client extension) — prefer extending these over ad hoc curl commands when adding new endpoints.
