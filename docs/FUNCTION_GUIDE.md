# NetCommand Hub - Function Guide

A reference for **what every feature, API endpoint, module and function does**. It is written for people who want to use the API, extend the app or find where something happens in the code.

Contents

1. [Feature → function map](#1-feature--function-map)
2. [HTTP API reference](#2-http-api-reference)
3. [Template engine rules](#3-template-engine-rules)
4. [Backend modules and functions](#4-backend-modules-and-functions)
5. [Frontend modules and functions](#5-frontend-modules-and-functions)
6. [Data files](#6-data-files)
7. [Scripts](#7-scripts)

---

## 1. Feature → function map

| What the user does | Frontend | API call | Backend functions |
|---|---|---|---|
| See dashboard numbers | `pages/Overview.tsx` | `GET /api/stats`, `/api/vendors`, `/api/categories` | `stats()`, `vendors()`, `categories()` in `main.py` |
| Search / filter / sort / page | `pages/Library.tsx` | `GET /api/templates` | `search.search()`, `tokenize()`, `score()`, `matches_filters()` |
| Global search box | `AppShell.GlobalSearch` | (navigates to Library) | - |
| Open template details | `pages/TemplateDetail.tsx` | `GET /api/templates/{id}` | `template_detail()` |
| Fill form + generate | `pages/Builder.tsx`, `PlaceholderForm` | `POST /api/templates/{id}/generate` | `engine.render()` → `validate_values()` → `validate_value()` → `substitute()` |
| Client-side field checks | `lib/validate.validateField` | - | (mirrors `engine.validate_value`) |
| Copy to clipboard | `CopyButton`, `lib/files.copyText` | - | - |
| Download .txt/.cfg/.md | `lib/files.downloadText`, `generatedToMarkdown`, `templateToMarkdown` | - | - |
| Compare configurations | `pages/DiffPage.tsx`, `DiffViewer` | `POST /api/diff` | `diffing.diff_text()` |
| Favourite a template | `FavouriteButton`, `lib/store.toggleFavourite` | (list: `GET /api/templates?ids=`) | - |
| Recently viewed | `lib/store.pushRecent` | `GET /api/templates?ids=` | - |
| Create personal template | `pages/MyTemplates.tsx` | `POST /api/personal/validate` | `build_personal()`, `engine.check_personal_body()` |
| Use personal template | `pages/Builder.tsx` (My templates tab) | `POST /api/personal/generate` | `build_personal()` → `render()` |
| Import / export templates | `MyTemplates.importFile`, `exportAll` | `POST /api/personal/validate` (per item) | same as above |
| Glossary | `pages/Glossary.tsx` | `GET /api/glossary` | `glossary()` |
| Theme / sidebar state | `ThemeToggle`, `lib/store` | - | - |
| Start-up validation of all content | - | - | `loader.load_store()` (server refuses to start on any error) |

---

## 2. HTTP API reference

Base URL: `http://127.0.0.1:8000`. Interactive documentation (try-it-out): `/docs`. All responses are JSON.

### Error format (every error)

```json
{ "error": { "code": "validation_failed", "message": "One or more fields are invalid",
             "details": { "vlan_id": "Must be between 1 and 4094" } } }
```

| HTTP | `code` | When |
|---|---|---|
| 404 | `not_found` | Unknown template ID or path |
| 405 | `method_not_allowed` | Wrong HTTP method |
| 413 | `payload_too_large` | Body over `NCH_MAX_BODY_BYTES` (default 1,000,000) |
| 422 | `invalid_request` | Request shape/limits wrong; `details` is a list of `{field, message}` |
| 422 | `validation_failed` | A value or personal template failed validation; `details` maps field → message |
| 500 | `internal_error` | Unexpected error. The message is generic; the stack trace is only in the server log |

Request bodies reject unknown fields. Large inputs are capped.

### `GET /api/health`
Returns `{"status":"ok","templates":<count>}`.

### `GET /api/vendors`
Vendors with their platforms and **real** counts.
```json
[{ "id":"cisco","name":"Cisco","description":"...","website_url":"https://www.cisco.com",
   "template_count":52,
   "platforms":[{"id":"ios","vendor":"cisco","name":"Cisco IOS","os_family":"IOS","version_notes":"...","template_count":21}, ...] }]
```

### `GET /api/platforms?vendor=cisco`
Platform list, optionally for one vendor.

### `GET /api/categories`
Categories with `template_count`.

### `GET /api/stats`
`{ templates, vendors, platforms, by_status: {unverified: N, ...}, recent: [6 newest TemplateSummary] }`.

### `GET /api/templates`  (search / list)

| Query | Meaning | Limits |
|---|---|---|
| `q` | Search text (all words must match) | ≤ 200 chars |
| `vendor`, `platform`, `category` | Exact filters by ID | ≤ 40 chars |
| `status` | `draft`, `unverified`, `reviewed`, `lab-tested`, `needs-review` | |
| `difficulty` | `beginner`, `intermediate`, `advanced` | |
| `kind` | `config`, `show`, `operational` | |
| `version` | Substring of a recorded OS version. Entries with no recorded versions never match | ≤ 40 |
| `sort` | `relevance` (default), `alphabetical`, `reviewed`, `added` | other value → 422 |
| `page`, `page_size` | Pagination, default 1 / 20 | page 1-10000, size 1-100 |
| `ids` | Comma-separated IDs; returns only those (used by Favourites / Recently viewed) | ≤ 4000 chars |

Response: `{ total, page, page_size, items: [TemplateSummary], facets: { vendor: {id: n}, platform, category, verification_status, difficulty, kind } }`. Facet counts reflect the current filters.

`GET /api/search?q=...&page=&page_size=` is a shortcut for an unfiltered relevance search.

### `GET /api/templates/{template_id}`
Full template: metadata, `compatibility_note`, `prerequisites`, `placeholders`, raw `template` body (placeholders unfilled), `explanation`, `expected_outcome`, `verification_commands`, `rollback_notes`, `warnings`, `source_urls`, `review_evidence`, `tags`, and `related_templates` (summaries). Unknown ID → 404.

### `POST /api/templates/{template_id}/generate`
```json
{ "values": { "vlan_id": 10, "vlan_name": "USERS" } }
```
→
```json
{ "template_id":"cisco-ios-xe-vlan-create", "template_title":"Create a VLAN", "vendor":"cisco", "platform":"ios-xe",
  "kind":"config", "verification_status":"unverified", "compatibility_note":"...",
  "template_version":"1a048467d060", "generated_at":"2026-10-18T18:26:19Z",
  "config":"vlan 10\n name USERS",
  "verification_commands":["show vlan brief","show vlan id 10"],
  "warnings":["..."], "rollback_notes":"...", "values":{"vlan_id":"10","vlan_name":"USERS"},
  "notice":"Generated text only. It has NOT been applied to any device. ..." }
```
- Every placeholder must be supplied (or have a default). Extra fields are rejected.
- Errors: 422 `validation_failed` with one message per bad field; 404 for an unknown ID.
- `template_version` is the first 12 hex characters of a SHA-256 of the template body and verification commands - it changes when the template text changes.

### `POST /api/personal/validate`
Body: a personal template (`id` must match `personal-[a-z0-9-]{4,60}`; `title`, `vendor`, `platform`, `category`, `summary`, `difficulty`, `template`, `placeholders`, `verification_commands`, `warnings`, `tags`). Returns `{"ok":true,"warnings":[...],"verification_status":"unverified"}` or 422. Checks: vendor/platform/category exist and match; every `{{name}}` is defined and every placeholder used; body has no control characters and ≤ 500 lines; soft warnings for HTML-like text, shell substitution characters and likely literal secrets. A `verification_status` field in the body is rejected - personal templates cannot self-certify.

### `POST /api/personal/generate`
`{ "template": <personal template>, "values": {...} }` → same response as `generate`, always `unverified`, with an added warning *Personal / Unverified template*.

### `POST /api/diff`
```json
{ "original":"a\nb", "updated":"a\nc", "ignore_trailing_whitespace":false, "ignore_blank_lines":false }
```
→ `{ rows:[{type:"unchanged|added|removed", old_line, new_line, text}], added, removed, unchanged, identical, note }`. Each text ≤ 200,000 chars.

### `GET /api/glossary?q=lacp`
List of `{term, aka[], definition}`; `q` filters term, alternative names and definition.

---

## 3. Template engine rules

(`backend/app/engine.py`) - the same rules are mirrored in `frontend/src/lib/validate.ts` for instant feedback.

| Placeholder `type` | Accepts | Normalised to | Extra settings |
|---|---|---|---|
| `integer` | whole number in range | decimal string | `min`, `max` (required), `multiple_of` |
| `string` | single-line text | unchanged | `min_length` (1), `max_length` (64), `pattern` (full match). Without `pattern`: letters, digits, space and `. _ - : / , ( ) @ # +` |
| `enum` | one of `options` | unchanged | `options` (required) |
| `ipv4` | dotted IPv4, no leading zeros | canonical | - |
| `ipv4_netmask` | contiguous mask, e.g. `255.255.255.0` (`0.0.0.0`…`255.255.255.255`) | canonical | - |
| `ipv4_wildcard` | contiguous inverse mask, e.g. `0.0.0.255` | canonical | - |
| `ipv4_cidr` | `a.b.c.d/nn` | `ip/prefix` | `allow_host_bits: false` requires a network address |
| `vlan_list` | `10,20,30-40`, IDs 1-4094, max 64 entries | `10,20,30-40` or, with `output_style: space-to`, `10 20 30 to 40` | `output_style` |

Always enforced:

- Control characters, line breaks and Unicode line/paragraph separators are rejected in every value.
- Strings may not start or end with spaces; a `pattern` must match the **whole** value.
- Fields not defined by the template → `Unexpected field`.
- A field left empty uses its `default`; with no default it is `This field is required`.
- Substitution is **one pass** with `{{ name }}` only. A value that itself contains `{{x}}` is *not* expanded again. Templates cannot run code, shell commands or expressions.

---

## 4. Backend modules and functions

All under `backend/app/`.

### `config.py`
Reads optional environment variables: `ROOT`, `DATA_DIR` (`NCH_DATA_DIR`), `FRONTEND_DIST` (`NCH_FRONTEND_DIST`), `CORS_ORIGINS` (`NCH_CORS_ORIGINS`), `MAX_BODY_BYTES` (`NCH_MAX_BODY_BYTES`).

### `schemas.py` - Pydantic models (all reject unknown fields)

| Model | Purpose |
|---|---|
| `Vendor`, `Platform`, `Category`, `Catalog` | Catalogue entries from `catalog.yaml` |
| `GlossaryEntry` | Glossary item |
| `Placeholder` | One input field definition; validates its own settings (e.g. enum needs options, integer needs min/max, regex compiles) |
| `ExplanationItem` | `{line, text}` explanation row |
| `Template` | A full template. Validates: ID format; placeholder names; every `{{x}}` in the body and verification commands is defined; no unused placeholders; non-empty body; `reviewed`/`lab-tested` require `reviewed_at`, `review_evidence` and `source_urls` |
| `PersonalTemplate` | User-authored subset (no status field) |
| `TemplateSummary`, `SearchResponse` | List/search output |
| `GenerateRequest`, `GenerateResponse` | Generation I/O |
| `PersonalGenerateRequest`, `PersonalValidateResponse` | Personal template I/O |
| `DiffRequest`, `DiffRow`, `DiffResponse` | Diff I/O |

`referenced_placeholders(*texts)` returns the set of `{{names}}` used in the given strings.
Constants: `TEMPLATE_ID_RE`, `PLACEHOLDER_NAME_RE`, `PLACEHOLDER_REF_RE`.

### `engine.py`

| Function / class | Does |
|---|---|
| `FieldError` | One field failed validation (message is user-facing) |
| `ValidationFailed(errors)` | All field errors for a request; becomes the 422 `validation_failed` response |
| `validate_value(ph, value)` | Validates and normalises one value for its placeholder; raises `FieldError` |
| `validate_values(placeholders, values)` | Validates a whole set: flags unexpected fields, applies defaults, collects every error; returns normalised values |
| `substitute(text, values)` | Single-pass `{{name}}` replacement |
| `template_version(t)` | 12-char SHA-256 fingerprint of the body + verification commands |
| `render(t, values)` | Validate → substitute body and verification commands → `GenerateResponse` with UTC timestamp and the not-applied notice |
| `check_personal_body(body)` | Raises `ValueError` for control characters or > 500 lines; returns soft warnings (HTML-like text, `$(`/backtick, probable literal secrets) |
| Private helpers | `_ipv4`, `_validate_integer`, `_validate_string`, `_validate_enum`, `_validate_netmask`, `_validate_wildcard`, `_validate_cidr`, `_parse_vlan_list`, `_validate_vlan_list` |

### `loader.py`

| Function / class | Does |
|---|---|
| `load_store(data_dir)` | Reads `catalog.yaml`, `glossary.yaml` and every `data/vendors/**/*.yaml`; expands each template once per listed platform (`<vendor>-<platform>-<id>`); validates schema, unique IDs, vendor/platform/category references, `related` links and non-empty compatibility notes; **raises `ContentError` listing every problem** |
| `ContentError(problems)` | Carries the problem list; the server refuses to start |
| `Store` | In-memory result: `catalog`, `glossary`, `templates` (dict by ID), `order`; helpers `vendor_name()`, `platform()`, `category_name()` |
| `_read_yaml` | `yaml.safe_load` only (never builds arbitrary objects); 2 MB file limit |

### `search.py`

| Function | Does |
|---|---|
| `tokenize(q)` | Lower-cased words (max 12) |
| `score(store, t, tokens)` | AND semantics: every word must be a substring of some field; score = sum of the best field weight per word (title 6, tags 4, task 4, summary 3, vendor/platform 3, category 2, command text 1, verification text 1, explanation 1); `-1` when a word has no match |
| `matches_filters(t, f)` | Exact filters; `version` requires a recorded matching version |
| `summarize(t)` | `Template` → `TemplateSummary` |
| `search(store, q, filters, sort, page, page_size)` | Filter → score → stable sort (ties broken by title then ID) → facets → page |
| `Filters` | Dataclass of filter values; `SORTS` lists valid sort names |

### `diffing.py`

`diff_text(original, updated, ignore_ws, ignore_blank)` splits on real newlines (CRLF/CR normalised), compares with `difflib.SequenceMatcher` (junk heuristic off), and returns rows with original and updated line numbers. Options change only the **comparison key**; returned text is always the user's original line.

### `main.py`

| Item | Does |
|---|---|
| `create_app()` | Builds the FastAPI app: body-size limit, CORS (GET/POST, listed origins only), security headers, error handlers, all routes, and (if `frontend/dist` exists) static files + SPA fallback |
| `lifespan` | Loads and validates all content once at start-up |
| `BodyLimitMiddleware` | Rejects bodies over the limit, whether declared or streamed |
| `security_headers` middleware | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a strict Content-Security-Policy for the web app |
| `build_personal(store, p)` | Turns a `PersonalTemplate` into a full `Template` forced to `unverified`; checks vendor/platform/category and body |
| `error_body`, `get_store` | Error JSON builder; request → store accessor |
| Route functions | `health`, `vendors`, `platforms`, `categories`, `stats`, `list_templates`, `search_alias`, `template_detail`, `generate`, `personal_validate`, `personal_generate`, `diff`, `glossary`, `spa` |

---

## 5. Frontend modules and functions

All under `frontend/src/`.

### `api.ts`
`ApiError` (fields: `status`, `code`, `message`, `fields`), helper `qs()`, and the `api` object:
`vendors()`, `platforms(vendor?)`, `categories()`, `stats()`, `search(params)`, `template(id)`, `generate(id, values)`, `generatePersonal(template, values)`, `validatePersonal(template)`, `diff(original, updated, ignoreWs, ignoreBlank)`, `glossary(q)`.
Network failures become `ApiError` with code `network` (UI shows "Cannot reach the server").

### `lib/store.ts` - saved browser data
`createStore` makes a persisted store (every `localStorage` access is in try/catch; falls back to memory). Stores: `favouritesStore`, `recentStore`, `themeStore`, `sidebarStore`, `personalStore`. `useStore(store)` subscribes a component. Helpers: `toggleFavourite(id)`, `pushRecent(id)` (unique, newest first, max 8), `newPersonalId()`.

### `lib/validate.ts`
`validateField(placeholder, value)` → error text or `null` (mirrors the server rules). `findPlaceholders(text)` → unique `{{names}}`.

### `lib/files.ts`
`safeFileName`, `downloadText`, `copyText` (Clipboard API, then `execCommand` fallback; returns success), `generatedToMarkdown`, `templateToMarkdown`.

### `lib/hooks.ts`
`useAsync(fn, key)` (loading / data / error / reload, ignores stale responses), `useDebounced`, `useDocumentTitle`.

### `lib/catalog.tsx`
`CatalogProvider` loads vendors and categories once; `useCatalog()`; `categoryName()`.

### `lib/labels.ts`
Text for statuses, difficulties and command types; `vendorName`, `platformName`, `fmtDate`.

### Components (`components/`)

| Component | Purpose |
|---|---|
| `AppShell`, `ThemeToggle`, `GlobalSearch` | Layout: sidebar (collapsible, mobile drawer), top bar, `/` shortcut, theme switch |
| `TemplateCard`, `FavouriteButton` | Result card with badges and favourite star |
| `CodeBlock` (+ `highlightLine`) | Monospace panel, line numbers, copy button, Configuration/Verification label; builds React nodes (never HTML) |
| `CopyButton` | Copy with success/failure feedback |
| `PlaceholderForm`, `validateAll` | Form generated from placeholder metadata, inline errors, accessible hints |
| `DiffViewer`, `diffToText`, `diffToMarkdown` | Diff table with text labels, counts and exports |
| `ConfirmDialog` | Modal confirmation (focus on the safe button, Esc cancels, focus restored) |
| `ToastProvider`, `useToast` | Non-blocking messages in an `aria-live` region |
| `VerificationBadge`, `CompatibilityBadge`, `DifficultyBadge`, `KindBadge`, `PageHeader`, `EmptyState`, `ErrorState`, `Skeleton`, `CardSkeletons`, `FormField`, `Disclaimer` | Shared UI pieces (`components/ui.tsx`) |
| `Icon` | Inline SVG icons |

### Pages (`pages/`)

| Page | Route |
|---|---|
| `Overview` | `/` |
| `Library` | `/library` (filters in the URL: `q, vendor, platform, category, kind, status, difficulty, version, sort, page`) |
| `TemplateDetail` | `/library/:id` |
| `VendorList`, `VendorDetail` (in `Vendors.tsx`) | `/vendors`, `/vendors/:vendorId` |
| `Builder` | `/builder` (`?template=<id>`, `?personal=<id>`, `?source=personal`) |
| `DiffPage` | `/diff` |
| `Favourites` | `/favourites` |
| `MyTemplates` | `/my-templates` |
| `Glossary` | `/glossary` |
| `About` | `/about` |

Key functions inside pages: `Builder.run()` (validate → call API → handle field errors, ignores out-of-date responses), `MyTemplates.save()` (client checks → server validation → store), `MyTemplates.importFile()` (size/format check → rebuild each object from known fields → server validation → fresh IDs where needed → report), `MyTemplates.exportAll()`, `Library.update()` (writes filters to the URL).

---

## 6. Data files

| File | Content |
|---|---|
| `data/catalog.yaml` | Vendors, platforms (OS families) and categories with IDs |
| `data/glossary.yaml` | Glossary terms |
| `data/vendors/cisco/ios-and-ios-xe.yaml` | Cisco templates, expanded for `ios` and `ios-xe` |
| `data/vendors/cisco/nx-os.yaml` | Cisco NX-OS templates |
| `data/vendors/dell/os6.yaml`, `os9.yaml`, `os10.yaml` | Dell templates per OS |
| `data/vendors/huawei/vrp.yaml` | Huawei VRP templates |
| `data/vendors/fortinet/fortios.yaml` | FortiOS templates |

Current content: **122 templates** (Cisco IOS 21, IOS-XE 21, NX-OS 10; Dell OS6 9, OS9 12, OS10 13; Huawei VRP 17; FortiOS 19) in 23 categories, plus 18 glossary terms. All are `unverified`. To add or change content see [TEMPLATE_AUTHORING_GUIDE.md](TEMPLATE_AUTHORING_GUIDE.md).

---

## 7. Scripts

| Script | Does |
|---|---|
| `setup.bat` → `scripts/setup.ps1` | One-time install + build + validate |
| `start.bat` → `scripts/start.ps1` | Start production server (checks prerequisites and port) |
| `start-dev.bat` → `scripts/dev.ps1` | API with reload + Vite dev server |
| `scripts/test-all.ps1` | Runs every automated check |
| `scripts/validate_templates.py` | Validates all content; exit code 1 and a problem list on failure (also run in CI) |
