# Testing

## Run everything

```bash
powershell -ExecutionPolicy Bypass -File scripts\test-all.ps1
```

Order: template validation → backend lint (ruff) → backend tests (pytest) → frontend lint (ESLint) → TypeScript check → frontend tests (Vitest) → production build.

Individual commands:

```bash
backend\.venv\Scripts\python scripts\validate_templates.py
cd backend && .venv\Scripts\python -m ruff check app tests && .venv\Scripts\python -m pytest -q
cd frontend && npm run lint && npm run typecheck && npm test && npm run build
```

## Automated coverage

### Backend (86 tests, `backend/tests/`)

| File | Covers |
|---|---|
| `test_engine.py` | Each placeholder type (valid and invalid values), ranges, multiple-of, netmask/wildcard rules, CIDR host bits, VLAN list parsing and both output styles, enum, string injection attempts (newline, CR, NUL, tab, quotes, `! ? \| ; $` backtick, U+2028), regex full-match, unexpected/missing fields, defaults, single-pass substitution, template metadata rules (undefined/unused placeholders, reviewed without evidence, unknown fields), personal body checks |
| `test_content.py` | All four vendors present; every platform has templates; unique prefixed IDs; valid references; review evidence rules; nothing falsely marked reviewed; compatibility notes; **every template renders with its own examples without leftover `{{...}}`**; platform-syntax spot checks (NX-OS CIDR vs IOS-XE mask, Huawei Vlanif, FortiOS blocks, Dell OS9 `untagged` vs OS10 `switchport`); broken data is rejected |
| `test_search.py` | Empty query, pagination, case-insensitive and partial matching, AND semantics, strict vendor/platform filters (no leakage), the spec's example searches, special characters, version filter excludes unversioned entries, deterministic sort |
| `test_diff.py` | Add/remove/identical/empty, line numbers, CRLF vs LF, ignore whitespace (original text preserved), ignore blank lines, Unicode and 50,000-character lines, semantic-validator disclaimer |
| `test_api.py` | Health, vendors/platforms/categories/stats (counts consistent), filter/sort/page validation, `ids` filter, detail + 404 error format, generate success, per-field validation errors, body unknown fields, injection blocked, diff limits, request body limit (413), glossary, personal validate/generate/rejections (cannot self-certify, wrong platform, undefined placeholder, bad ID, secret warning), no stack traces |

### Frontend (22 tests, `frontend/src/test/`)

| File | Covers |
|---|---|
| `validate.test.ts` | Client validation for every type, defaults, injection characters, `findPlaceholders` |
| `components.test.tsx` | DiffViewer labels and exports; CodeBlock (line numbers, labels, no HTML injection, highlighting, copy success and failure); PlaceholderForm (inline error, `aria-invalid`, change events); VerificationBadge; ConfirmDialog (focus, Escape, confirm, closed); stores (favourites, recent cap, personal IDs) |

### Content validation

`scripts/validate_templates.py` runs the same loader the server uses at start-up and is the CI gate for content.

## Results at the time of writing

Run on Windows 10, Python 3.14, Node 24: backend 86 passed; frontend 22 passed; ESLint and TypeScript clean; production build succeeded; 122 templates validated. Re-run the commands above to confirm on your machine - results are not guaranteed to be identical on other versions.

## Manual QA checklist

Performed once during development in the built-in browser (desktop and 375 px mobile): overview, library filters/chips, mobile filter drawer, detail page, builder (empty-field errors, generation, verification block, checklist), diff (sample), theme toggle persistence, no application console errors. **Not yet done:** screen-reader testing, Firefox/Safari checks, keyboard-only walkthrough of every page, contrast measurement of both themes, and end-to-end tests with a browser automation framework. Please run these before a public release.

| Area | Check |
|---|---|
| Routes | Every sidebar link opens; unknown URL shows "Page not found"; reload on a deep link (`/library/<id>`) works |
| Library | Search, each filter, sort, chips, clear all, paging, empty state, URL restore, mobile drawer |
| Detail | Sections in order; copy; favourite; Open in builder; exports |
| Builder | Every template renders a form; invalid values rejected; live update; copy and downloads; checklist |
| Diff | Sample, swap, options, copy/export, empty inputs, 200k limit message |
| Favourites / My Templates | Add/remove; create/edit/delete (confirm); import rejects bad files; export round-trip |
| Themes | Dark and light on every page; contrast of badges and code |
| Accessibility | Tab order, focus ring, skip link, labels, reduced motion |
| Security | Try `"` `\n` `!` in text fields; try 1 MB body; confirm no secrets in repo |

## Adding tests

- Backend: add to `backend/tests/`; use the `client` and `store` fixtures in `conftest.py`.
- Frontend: add `*.test.ts(x)` under `frontend/src/test/`; `src/test/setup.ts` registers jest-dom matchers.
