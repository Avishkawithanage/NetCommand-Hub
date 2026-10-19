# Architecture

## Overview

```text
 Browser (React + TypeScript SPA)            Python process (FastAPI / Uvicorn)
 ┌──────────────────────────────┐   /api    ┌──────────────────────────────────────────┐
 │ pages, components, hooks     │ ───────▶  │ routes (main.py)                         │
 │ lib/validate (instant checks)│           │  ├─ search.py   (in-memory index)        │
 │ localStorage:                │           │  ├─ engine.py   (validate + substitute)  │
 │  favourites, recent,         │ ◀───────  │  ├─ diffing.py  (line diff)              │
 │  personal templates, theme   │   JSON    │  └─ loader.py → data/*.yaml (read once)  │
 └──────────────────────────────┘           └──────────────────────────────────────────┘
```

In production one process serves both the API and the built web app (`frontend/dist`) on `127.0.0.1:8000`. In development Vite serves the UI on :5173 and proxies `/api` to :8000.

## Decisions

| Decision | Reason |
|---|---|
| **Templates are YAML files validated at start-up**, loaded into memory | Version-controlled, reviewable in diffs, no migration/seed step. The server refuses to start on any content error, so invalid data cannot be served |
| **No SQL database, no Alembic** | With read-only content and no accounts there is nothing to persist server-side. A database would add moving parts without benefit in Phase 1. If accounts or shared templates are added later, SQLite/PostgreSQL + migrations is the planned step |
| **No authentication; favourites and personal templates in browser local storage** | The spec says to start without login unless needed ("documented local mode"). Trade-off: data is per browser/address and lost if site data is cleared - mitigated by JSON export/import |
| **Server-side validation is authoritative; client mirrors it** | Instant feedback without trusting the browser |
| **Hand-written CSS with design tokens instead of Tailwind/shadcn** | Fewer dependencies and build steps for a small app; dark/light tokens live in one place (`styles.css`) |
| **Own highlighter that outputs React nodes** | Avoids a large editor dependency and any HTML injection path |
| **Diff via Python `difflib`** | Deterministic, tested, no extra dependency |
| **Each platform has its own template entries** | Compatibility is explicit; shared text (Cisco IOS/IOS-XE) is expanded per platform by the loader rather than implied |

## Data model

```text
Vendor ─┬─ Platform (OS family) ─── Template (vendor + platform + category + status + placeholders + body)
        └─ ...
Category ─── Template
```

Template IDs are stable: `<vendor>-<platform>-<local-id>`, e.g. `dell-os10-lag-lacp`. Full field list: [TEMPLATE_AUTHORING_GUIDE.md](TEMPLATE_AUTHORING_GUIDE.md) and `backend/app/schemas.py`.

## Request flow: generate a configuration

1. UI: `PlaceholderForm` → `validateAll()` (client rules). Errors stop the request and focus the first bad field.
2. `POST /api/templates/{id}/generate {values}`.
3. `render()` → `validate_values()` rejects unexpected fields, applies defaults, validates every value by type, collects all errors.
4. `substitute()` replaces `{{name}}` once in the body and in each verification command.
5. Response includes the config, verification commands, warnings, rollback notes, template version, UTC timestamp and the "not applied to any device" notice.
6. UI renders it in `CodeBlock` (React nodes; never raw HTML), offers copy/exports, and re-requests automatically (debounced) when inputs change.

## Security design (summary)

- No device connectivity, no stored device credentials.
- Template substitution only; no code/shell/expression execution; `yaml.safe_load` only.
- Allow-list validation per value type; control characters and line breaks always rejected; single-pass substitution.
- Request body limit, field length limits, unknown-field rejection, generic 500 responses (no stack traces).
- CORS limited to configured origins; GET/POST only; security headers including a strict CSP for the web app.
- Server binds to localhost; no telemetry; pasted configs go nowhere except the local server.
Details: [SECURITY.md](../SECURITY.md).

## Directory map

```text
backend/app/   main.py routes · engine.py · loader.py · search.py · diffing.py · schemas.py · config.py
backend/tests/ test_engine · test_content · test_search · test_diff · test_api
frontend/src/  App.tsx · main.tsx · api.ts · types.ts · styles.css
               components/ · pages/ · lib/ (store, validate, files, hooks, labels, catalog) · test/
data/          catalog.yaml · glossary.yaml · vendors/**.yaml
scripts/       *.ps1 launchers · validate_templates.py
```

## Extending

- **New template/platform/vendor:** edit YAML (see authoring guide); no code changes.
- **New placeholder type:** add it to `PlaceholderType` and `Placeholder` checks in `schemas.py`, a validator in `engine.py`, the mirror in `frontend/src/lib/validate.ts` and `types.ts`, plus tests.
- **New page:** add a file in `pages/`, a route in `App.tsx` and (if needed) a nav entry in `AppShell.tsx`.
- **Accounts / shared storage (future):** introduce a repository layer behind the favourites/personal-template stores and an auth system with its own threat model.
