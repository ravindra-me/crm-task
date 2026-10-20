# CRM Contact Workspace

A small CRM workspace for browsing, searching, filtering and editing contacts and managing their tags.
React + TypeScript on the frontend and FastAPI + PostgreSQL on the backend, in an Nx monorepo.
Docker is only used to run the database.

## Contents

- [Getting started](#getting-started)
- [Everyday commands](#everyday-commands)
- [Environment files](#environment-files)
- [Tests and checks](#tests-and-checks)
- [Tech stack](#tech-stack)
- [Data model](#data-model)
- [API](#api)
- [Concurrent updates](#concurrent-updates)
- [Important technical decisions](#important-technical-decisions)
- [Frontend structure](#frontend-structure)
- [Scale considerations](#scale-considerations)
- [Known issues and limitations](#known-issues-and-limitations)
- [Deployment](#deployment)

## Getting started

Requirements: Node 22+, Python 3.12 with [uv](https://docs.astral.sh/uv/), Docker (for Postgres only).

1. Create `apps/backend/.env` (it is gitignored, so the password never reaches the repo). Pick any
   password: it becomes your local database's password the first time Postgres starts.

   ```
   POSTGRES_USER=crm
   POSTGRES_PASSWORD=<any password you like>
   POSTGRES_DB=crm
   DB_HOST=localhost
   DB_PORT=5433
   CORS_ORIGINS=http://localhost:5173
   LOG_LEVEL=INFO
   DB_ECHO=false
   BACKEND_PORT=8000
   ```

2. Then:

   ```bash
   npm install        # Nx + frontend dependencies
   npm run setup      # uv sync, Postgres, migrations, 15 demo contacts
   npm run dev        # API on :8000 and web app on http://localhost:5173
   ```

To change the password later, update it in `.env` and in Postgres
(`npm run db:shell`, then `ALTER USER crm WITH PASSWORD '...';`), or start over with
`npm run db:down -- -v`, which deletes your local data.

On shared servers (staging, production) the password is not chosen by hand: the hosting platform or
a secrets manager provides `POSTGRES_PASSWORD` and the other values as environment variables, which
the API reads before `.env`.

`npm run setup` is safe to re-run: it only seeds an empty database, and stops with the list above
if `apps/backend/.env` is missing.

```
crm-contact-workspace/
  apps/
    backend/                FastAPI app → Nx project "backend"
      app/, migrations/, tests/
      docker-compose.yml    Postgres only (the one Docker file in the repo)
      postgres-init.sql     creates the crm_test database on first start
      pyproject.toml, uv.lock          dependencies (used by uv)
      requirements.txt      the packages we use, for pip
    frontend/               React + Vite app → Nx project "frontend"
  scripts/setup.mjs         one-time setup behind `npm run setup`
  nx.json, package.json     Nx config and the root commands
```

## Everyday commands

| Command                              | What it does                                                            |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `npm run dev`                        | Start Postgres, run migrations, then the API (`--reload`) and Vite together |
| `npx nx serve backend`               | Only the API (plus Postgres + migrations)                                |
| `npx nx serve frontend`              | The web app; it starts the API too, because it depends on it             |
| `npm run check`                      | Lint, type check, test and build both apps (cached by Nx)                |
| `npm test`                           | Unit/integration tests of both apps                                      |
| `npm run e2e`                        | Playwright (seeds the database first, reuses running servers)            |
| `npx nx run backend:migrate`         | `alembic upgrade head`                                                   |
| `npx nx run backend:seed --reset --count 200000` | Reseed with a bigger data set                                |
| `npm run db:up` / `npm run db:down`  | Start / stop Postgres (data stays in the `pgdata` volume)                |
| `npm run db:shell`                   | Open a SQL prompt (`psql`) on the database                               |
| `npx nx graph`                       | Visualise projects and task dependencies                                 |

How the tasks depend on each other:

```
frontend:serve ──▶ backend:serve ──▶ backend:migrate ──▶ backend:db-up (docker compose up db)
frontend:e2e   ──▶ backend:seed  ──▶ backend:migrate
backend:test   ──▶ backend:db-up
```

`lint`, `typecheck`, `format-check`, `test` and `build` are cached: re-running them without
changes is instant.

**Backend dependencies.** `requirements.txt` lists every package we use directly: 7 for the API
(FastAPI, Uvicorn, SQLAlchemy, Psycopg, Alembic, pydantic-settings, email-validator) and 4 for tests and
checks (pytest, httpx, ruff, mypy). `pip install -r requirements.txt` installs them all. uv reads the
same list from `pyproject.toml`, and `uv.lock` pins them plus everything they depend on. When you add a
package, add it to both `pyproject.toml` and `requirements.txt`; a test fails if they differ.

**Tool caches.** `.mypy_cache`, `.pytest_cache`, `.ruff_cache` and `.nx/` are created automatically
by the tools to speed up the next run. They're gitignored and safe to delete.

Migrations by hand (from `apps/backend`):

```bash
uv run alembic upgrade head                          # apply
uv run alembic downgrade -1                          # roll back one
uv run alembic revision -m "add something"           # new migration (written by hand)
```

Set `DB_ECHO=true` in `apps/backend/.env` to print every SQL statement the API runs.

## Environment files

Each app has its own `.env`, gitignored so passwords never reach GitHub. You create
`apps/backend/.env` yourself (Getting started, step 1). `apps/frontend/.env` is optional: without it
the defaults below apply. Postgres only listens on `127.0.0.1`, so nothing else on your network can
reach it.

| File                 | Used by                     | Variables                                                         |
| -------------------- | --------------------------- | ----------------------------------------------------------------- |
| `apps/backend/.env`  | docker compose, API, Alembic, tests | Database: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST` (localhost), `DB_PORT` (5433)<br>API: `CORS_ORIGINS`, `LOG_LEVEL`, `DB_ECHO`, `BACKEND_PORT` |
| `apps/frontend/.env` | Vite                         | `VITE_API_BASE_URL`, `VITE_REQUEST_TIMEOUT_MS` (sent to the browser)<br>`FRONTEND_PORT`, `API_PROXY_TARGET` (dev server only, never bundled) |
| `apps/frontend/.env.test` | Vitest (committed)      | Fixed values so tests don't depend on your local `.env`           |

The API builds its database connection from the same `POSTGRES_*`, `DB_HOST` and `DB_PORT` values Docker uses, so the password lives in one place; tests use the `<POSTGRES_DB>_test` database. Keep `BACKEND_PORT` and
`API_PROXY_TARGET`, and `FRONTEND_PORT` and `CORS_ORIGINS`.

In the browser, all API calls go to `/api/v1` on the Vite dev server, which proxies them to the API.
So there is no CORS in development.

## Tests and checks

```bash
npm run check                    # everything below except e2e, for both apps
npx nx test backend              # pytest against the crm_test database
npx nx test frontend             # Vitest unit + component tests
npx playwright install chromium  # once
npm run e2e                      # Playwright, desktop + mobile
```

What is covered, roughly in order of risk:

- **Concurrent edits**: stale versions are rejected with the latest data; two simultaneous saves of
  the same version, only one wins (real threads against Postgres); the UI conflict flow (component
  test + an e2e test with two browser pages).
- **Email uniqueness**: case-insensitive duplicates rejected, empty emails allowed for many contacts.
- **Search / filter / sort / pagination**: name across first + last name, email, phone ignoring
  formatting, LIKE wildcards escaped, tag and company filters combined, paging past the end.
- **Tags**: case-insensitive reuse, idempotent add, bulk assign counts, unknown ids rejected as a
  whole with nothing changed.
- **Activity**: only real changes logged, newest first, limit respected.
- **Validation and errors**: the shared error format, field names in 422s, bad query params.
- **Frontend**: the axios client (list params, error normalisation, network errors), `useMutate`
  (method, URL and body per verb), URL filter parsing, form schema/diffing, the pagination helper.

Backend tests run against real Postgres, not SQLite, because several behaviours (trigram search,
`ON CONFLICT`, row locks, functional unique indexes) are Postgres-specific.

Latest local run: backend 55 passed, frontend 44 passed, Playwright 16 passed (desktop + mobile).

CI (`.github/workflows/ci.yml`) runs `npm run setup`, then `nx run-many -t lint typecheck
format-check test build`, then the Playwright suite.

## Tech stack

| Area      | Choice                                                                          |
| --------- | ------------------------------------------------------------------------------- |
| Monorepo  | Nx 23 (explicit `project.json` targets, no plugins), npm workspaces              |
| Frontend  | React 19, TypeScript (strict), Vite, React Router, TanStack Query, axios, React Hook Form + Zod, CSS Modules with design tokens |
| Backend   | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 (sync), Alembic, Psycopg 3       |
| Database  | PostgreSQL 17 with `pg_trgm`, run with Docker Compose                            |
| Testing   | pytest + FastAPI TestClient, Vitest + Testing Library, Playwright               |
| Tooling   | uv, Ruff, mypy (strict), ESLint, Prettier, GitHub Actions                        |

## Data model

```
contacts                                   tags
───────────────────────────────            ─────────────────────
id            bigint identity  PK          id          int identity  PK
first_name    varchar(100)  not null       name        varchar(40)   not null
last_name     varchar(100)  not null       created_at  timestamptz
email         varchar(254)  null           unique (lower(name))
phone         varchar(32)   null
phone_digits  generated: digits of phone            contact_tags
company       varchar(200)  null           ─────────────────────────────────
version       int  default 1               contact_id  → contacts.id  (cascade)
created_at    timestamptz                  tag_id      → tags.id      (cascade)
updated_at    timestamptz                  created_at  timestamptz
unique (lower(email))                      PK (contact_id, tag_id)

contact_activities
──────────────────────────────────────────
id          bigint identity  PK
contact_id  → contacts.id (cascade)
type        CONTACT_UPDATED | TAG_ADDED | TAG_REMOVED   (check constraint)
details     jsonb   e.g. {"changes": {"email": {"from": "a@x.com", "to": "b@x.com"}}}
created_at  timestamptz
```

Indexes:

| Index                                         | Used for                                   |
| --------------------------------------------- | ------------------------------------------ |
| `uq_contacts_email_lower` (unique)            | "email unique when present", case-insensitive |
| `ix_contacts_created_at (created_at, id)`     | sort by created date                       |
| `ix_contacts_name_sort (lower(first), lower(last), id)` | sort by name                     |
| GIN trigram on full name, email, phone digits, company | `%term%` search and company filter |
| `ix_contact_tags_tag_id (tag_id, contact_id)` | filter by tag (the PK covers lookups by contact) |
| `ix_contact_activities_contact_recent`        | recent activity for one contact            |
| `uq_tags_name_lower` (unique)                 | "VIP" and "vip" are the same tag           |

## API

All endpoints are under `/api/v1`. Full schema in Swagger at `/docs`.

| Method | Path                                   | Notes                                                         |
| ------ | -------------------------------------- | ------------------------------------------------------------- |
| GET    | `/contacts`                            | `search`, `company`, `tag_ids` (repeatable, matches any), `sort_by` (`name` or `created_at`), `sort_order` (`asc` or `desc`; default `created_at` `desc`), `page`, `page_size` (max 100) |
| GET    | `/contacts/{id}`                       |                                                               |
| PATCH  | `/contacts/{id}`                       | Partial update. Body must include `version`. 409 on stale version or duplicate email |
| POST   | `/contacts/{id}/tags`                  | `{"name": "VIP"}`, creates the tag if it doesn't exist         |
| DELETE | `/contacts/{id}/tags/{tag_id}`         | Returns the updated contact                                   |
| POST   | `/contacts/bulk/tags`                  | `{"contact_ids": [..], "names": ["VIP", "Lead"]}`: up to 1000 contacts and 10 tags, all in one transaction |
| GET    | `/contacts/{id}/activities?limit=20`   | Newest first                                                  |
| GET    | `/tags`                                | All tags, for the filter and suggestions                      |
| GET    | `/health`, `/health/ready`             | Liveness, and readiness (checks the database)                 |

Every error has the same shape:

```json
{ "error": { "code": "version_conflict", "message": "…", "details": { "current": { … } } } }
```

Codes: `validation_error` (422, `details` lists `{field, message}`), `not_found` (404),
`version_conflict` (409, `details.current` is the latest contact), `email_taken` (409),
`internal_error` (500, details are logged with a request id and never sent to the client).

## Concurrent updates

Optimistic locking with a `version` column:

1. Every contact has a `version`. The client gets it with the contact.
2. `PATCH` must send back the version it started from.
3. The server locks the row (`SELECT … FOR UPDATE`), compares versions, and only then writes and
   bumps `version`. The lock means two requests with the same version can't both pass the check.
   That case has its own test using two real threads.
4. If the version is old, the server returns **409 `version_conflict`** with the current contact.

In the UI, the edit form remembers the version it was opened with. A background refetch does not
change that version while the form has unsaved edits, otherwise the check would be bypassed.
On a 409 the user sees a field-by-field table of the saved value next to theirs, and can either
**discard their edit** (load the saved version) or **overwrite** (resend against the new version
knowingly).

Tag add/remove don't bump `version`. Adding a tag can't clobber anybody's field edits (it's a set
operation), and bumping the version would make every open edit form conflict for no reason.

Why not `If-Match`/ETag headers: same idea, but a field in the body is easier to see and test in an
assignment. Swapping to `ETag: W/"<version>"` + `If-Match` later is a small change.

## Important technical decisions

- **Postgres over SQLite.** The brief says to assume millions of contacts. Substring search needs
  trigram indexes, and correctness needs real row locks and `ON CONFLICT`. Postgres gives all of
  these, and the tests run against it.
- **Server-side search, filter, sort and paging**, as the brief asks. Search covers
  `first + ' ' + last`, email, and phone. Phone matching uses a generated digits-only column, so
  `555-0102` and `5550102` both find `+1 (555) 010-2030`.
- **Sorting is deterministic.** Every sort ends with `id` as a tie-breaker, so a row can't show up on
  two pages or go missing between them.
- **Router → service → repository.** Routes handle HTTP, services hold the rules (version check,
  email uniqueness, which activity to log), repositories hold the queries. Pydantic schemas and
  SQLAlchemy models are separate, so the API contract isn't tied to the table layout.
- **Synchronous SQLAlchemy.** FastAPI runs sync endpoints in a thread pool. At this scale async
  would add complexity without a measurable gain.
- **Email uniqueness at two levels.** The service checks first for a friendly error. The unique
  index on `lower(email)` is the real guarantee, and the service turns its `IntegrityError` into the
  same 409 if two requests race.
- **Migrations are written by hand.** Expression and trigram indexes don't autogenerate well, and
  the migration is the source of truth for the schema. `downgrade` works and was exercised.
- **Activity in the same transaction as the change**, so you never get a change without its log
  entry, or a log entry for a change that was rolled back. `details` is JSONB holding `from`/`to`
  per field, which is enough to show "Email: a@x.com → b@x.com".
- **Filters live in the URL** (`?search=ada&tag=2&sortBy=name&sortOrder=asc&page=3`), so views can be bookmarked and
  shared, and the back button works. Malformed params fall back to defaults.
- **TanStack Query for server state; no global store.** The only client state that matters is
  the filters (URL), the row selection (one hook), and form state (React Hook Form).
- **Selection is scoped to the current filters.** It survives paging but clears when the search or
  filters change, so you can't bulk-tag contacts you can no longer see.
- **Design tokens.** Primitives (palette, spacing, type scale) feed semantic tokens
  (`--color-surface`, `--color-action-primary`, `--radius-control`, …). Components only use the
  semantic layer, which is why dark mode is just a media query that remaps it
  (`apps/frontend/src/lib/theme/tokens.css`).

## Frontend structure

```
apps/frontend/src/
  main.tsx, App.tsx      Entry point and providers (React Query, toasts, router)
  api/
    axiosInstance.ts     The one axios instance: base URL + timeout from .env, error interceptor
    apiClient.ts         class Api { get, post, put, patch, delete } → `api`
    apiError.ts          ApiError (status, code, message, details, fieldErrors)
    endpoints.ts         Every API path in one place
  hooks/                 Generic hooks only
    useFetch.ts          GET: { url, params, enabled, enableCancel, onSuccess, onError }
    useMutate.ts         POST/PUT/PATCH/DELETE: { method, url, body, onSuccess, onError }
    useDebouncedCallback.ts
  pages/
    ContactsPage/        index.tsx, style.module.css,
                         components/ (toolbar, table, bulk tag modal, tag filter…),
                         hooks/ (useContactFilters: filters ⇄ URL, useSelection)
    ContactDetailPage/   index.tsx, style.module.css,
                         components/ (edit form, conflict notice, tags, activity)
  components/            Shared app components: AppLayout, RouteError, TagNameForm
  routes/                Router + PrivateRoute / PublicRoute guards
  lib/                   Design system (app code imports from '@/lib')
    theme/               tokens.css (primitive + semantic tokens, dark mode), global.css
    atoms/               Button, Icon, Input, Select, Checkbox, Tag, SelectableTag, Avatar,
                         Spinner, Skeleton
    molecules/           FormField, TextField, SelectField, Card, Alert, EmptyState,
                         Dropdown, Pagination, Toast, Tooltip, Modal
    organisms/           DataTable (column definitions, sortable headers, cards on mobile)
  types/                 API types
  utils/                 constants (reads .env), contactSchemas (Zod), queryClient,
                         format, pagination, classNames
```

Every component is a folder with `index.tsx` and `style.module.css`. A component used by one page
lives in that page's `components/` folder; one used by several goes in `src/components/`.

**Data fetching.** Components call two generic hooks directly; there are no per-entity wrappers.

```tsx
const { data, isPending, cancel } = useFetch<ContactPage>({
  url: endpoints.contacts(),
  params: toApiParams(filters),
  enabled: true,         // false = wait
  enableCancel: true,    // drop outdated requests (default)
  onSuccess: (page) => {},
  onError: (error) => {},
  placeholderData: keepPreviousData, // any other React Query option works too
});

const removeTag = useMutate<Contact, number>({
  method: 'delete',                                   // 'post' | 'put' | 'patch' | 'delete'
  url: (tagId) => endpoints.contactTag(contact.id, tagId),
  onSuccess: (updated) => {},
  onError: (error) => {},
});
removeTag.mutate(3);
removeTag.cancel(); // stop a request in flight; onError gets code "cancelled"
```

Components never touch the cache. One rule in `utils/queryClient.ts` (a TanStack `MutationCache`)
refetches everything on screen after any mutation finishes, so lists, details and activity always
show the latest server state.

**Bulk tagging.**
1. Tick contacts in the table.
2. The **Add tags** button in the toolbar becomes active. Until then it is `aria-disabled` with a
   tooltip, so it stays hoverable and keyboard-focusable.
3. Clicking it opens a modal (native `<dialog>`: focus trap, Escape and backdrop click to close),
   where you toggle existing tags and/or create new ones. All of them are applied in one request.

**Routes.** The app has no login, so all pages sit under `<PublicRoute />`. `<PrivateRoute
isAllowed={…} />` is there for pages that will need a signed-in user.

UI states handled: loading skeletons, keeping the previous page visible while the next loads,
empty list, no search results, page past the end, contact not found, network/timeout/server
errors with retry, field validation (client and server), duplicate email on the field, save
conflicts, and pending states on every button.

Accessibility: semantic table and landmarks, labelled inputs with linked error text and
`aria-invalid`, visible focus rings, a skip link, a keyboard-friendly dropdown (Escape closes it
and returns focus), `aria-live` for counts and toasts, and reduced-motion support.
The table turns into stacked cards below 1024px.

## Scale considerations

What I'd change for production scale (not implemented):

**Millions of contacts per account**
- Add `account_id` to every table and lead every index with it, so each query only touches one
  tenant. For the largest tenants, partition `contacts` by account (hash).
- Use keyset pagination (`WHERE (created_at, id) < (:last_created, :last_id)`) instead of `OFFSET`,
  which gets slower the deeper you page. The UI becomes "next/previous" plus "jump to start".
- `count(*)` over millions of matching rows is expensive. Show an estimate
  (`EXPLAIN` row estimate, or a capped count like "10,000+"), and only compute exact counts when
  they're cheap.

**Millions of updates per day**
- `contact_activities` grows fastest. Partition it by month and archive or expire old partitions.
  Or write activity to a queue (outbox table → Kafka/SQS) and build the history asynchronously.
- Keep transactions short (they already are: one row lock, one update, one insert).
- Watch autovacuum on the hot tables, and tune `fillfactor` so updates can stay on the same page.

**Frequent searches and filters**
- Move search to a dedicated engine (OpenSearch/Elasticsearch, or Postgres full-text with a
  denormalised search document), fed by change events. Trigram indexes work well for millions of
  rows but cost write throughput.
- Denormalise tag ids onto the contact (`int[]` with a GIN index) if tag filters dominate.
- Route list/search reads to read replicas. Cache the tag list and the first page of the default
  view per account, with short TTLs.

**Many simultaneous users**
- The API is stateless, so it scales horizontally behind a load balancer. Use PgBouncer in
  transaction mode in front of Postgres.
- Optimistic locking already scales well, since nothing is held across requests. Add rate limits
  per user/account, especially on bulk endpoints.
- Push changes to open clients (SSE/WebSocket), so an edit form can warn "this contact just
  changed" before the user hits Save.
- Bulk tagging of "everything matching this filter" (which could be 100k+ contacts) becomes a
  background job with progress reporting, instead of a synchronous request.

## Known issues and limitations

- Contacts can't be created or deleted from the UI or API (not in the brief's scope). Tags can't be
  renamed or deleted globally.
- No authentication or authorisation, and no multi-tenancy (`account_id`). Activity entries don't
  record *who* made the change.
- Pagination is offset-based with an exact total (see scale notes).
- Bulk tagging works on the selected contacts only (max 1000), not on "all contacts matching the
  filter". There is no bulk *remove*.
- The tag filter matches contacts having *any* of the selected tags (not *all*).
- `GET /tags` returns every tag. That's fine for tens or hundreds of tags, but not unbounded growth.
- Activity `details` keep old and new values, which may include personal data. A real system would
  need a retention policy for that.
- Tag suggestions use a native `<datalist>`, which looks slightly different in each browser.
- If you type in the search box and click "Clear filters" within the 300 ms debounce window, the
  typed text is applied afterwards.
- Dark mode follows the OS setting. There's no in-app toggle.
- E2E tests change the seeded data, so run `npx nx run backend:seed --reset` if you want a clean
  demo afterwards.

## Deployment

Docker is only used for local Postgres. This hasn't been deployed anywhere yet. A straightforward
path:

1. **Database**: a managed Postgres (RDS, Cloud SQL, Neon, …) with automated backups and
   point-in-time recovery. `pg_trgm` is available on all of these.
2. **Frontend**: `npx nx build frontend` produces static files in `apps/frontend/dist`. Host them on
   any static host or CDN (S3 + CloudFront, Netlify, Vercel, Nginx). Configure an SPA fallback to
   `index.html`, and either proxy `/api` to the API or build with `VITE_API_BASE_URL` set to the
   API's full URL.
3. **API**: from `apps/backend`, run `uv sync --no-dev`, then
   `uv run gunicorn app.main:app -k uvicorn.workers.UvicornWorker` (or plain `uvicorn` behind a
   process manager) on any VM or PaaS.
4. **Config** through environment or a secret manager: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DB_HOST`, `DB_PORT`, `CORS_ORIGINS` (the
   frontend's origin, if it differs from the API's), `LOG_LEVEL`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`.
5. **Migrations**: run `uv run alembic upgrade head` as a release step before starting the new API
   version. Keep migrations backwards-compatible (expand → deploy → contract).
6. **HTTPS** at the load balancer or platform. The request id in the logs is also returned as
   `X-Request-ID`. Use `/health/ready` for readiness checks.
7. **Rollback**: redeploy the previous build. Only roll back the schema (`alembic downgrade`) for a
   migration that has no data impact.
8. **Backups** locally (from `apps/backend`): `docker compose exec db pg_dump -U crm crm > backup.sql`,
   and restore with `docker compose exec -T db psql -U crm crm < backup.sql`.
