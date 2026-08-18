## Summary

<!-- What does this PR do, and why? Link related issues (e.g. Closes #123). -->

## Changes

<!-- Bullet list of the key changes. Call out any new/changed API endpoints or DB migrations. -->

-

## Migrations

- [ ] N/A — no schema changes
- [ ] Added a new migration in `/migrations` (`make migrate-create name=...`) and confirmed `make migrate-up` / `make migrate-down` both run cleanly

## Checklist

- [ ] Code follows the layering conventions in `CLAUDE.md` (`model` / `repository` / `service` / `handler`)
- [ ] No raw driver/pg errors leak past the repository layer
- [ ] `.env.example` updated if new config variables were added

## Screenshots / API examples (optional)

<!-- For behavior changes, include request/response examples or screenshots. -->
