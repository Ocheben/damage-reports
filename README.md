# Feature flag service — Fixico take-home

A from-scratch feature flag platform: a Laravel admin/API and a Next.js client
that consumes flags to drive a small "Car Damage Reports" app.

This README covers (1) how to run it, (2) how the pieces fit together, and
(3) the design choices worth flagging — pun intended.

> **No Pennant, no LaunchDarkly SDK.** The evaluation engine, rule strategies,
> caching, decision log and scheduled-window logic are all implemented here.

---

## TL;DR — running it locally

You need Docker (with Compose). From the repo root:

```bash
docker compose up -d --build
# wait for the api + client containers to be Healthy — usually <30s on first build
```

Then open:

- **App**: <http://localhost:3000>
- **Admin**: <http://localhost:3000/admin/flags>
- **Decision log**: <http://localhost:3000/admin/decisions>
- **API health**: <http://localhost:8088/up>

### Running the client outside Docker

If you'd rather iterate on the frontend with HMR:

```bash
docker compose up --build api redis
cd client
cp .env.local.example .env.local
npm install
npm run dev
```

The standalone client still talks to the dockerised API on port 8088.

The top-right "Demo flags" picker lists six seeded users — anonymous,
customers in NL/US, QA, staff, admin. Selecting one mints a fresh Sanctum
personal-access token server-side and stores it in a cookie. The browser
never asserts a role, so flag rules like "staff only" are genuinely
enforceable instead of header-spoofable. Flag rollouts re-evaluate against
the new identity in real time.

### Running the tests

API (PHPUnit, PHPStan level 6, Pint code style):

```bash
docker run --rm -v "$(pwd)/api:/app" -w /app composer:2 \
  sh -c "composer install --no-interaction --prefer-dist && \
         vendor/bin/pint --test && \
         vendor/bin/phpstan analyse --memory-limit=512M && \
         vendor/bin/phpunit"
# 53 tests, 178 assertions; PHPStan: 0 errors at level 6
```

Client (Vitest + ESLint + TypeScript) — requires Node 22 (Kubb CLI uses
`node:util.styleText`):

```bash
cd client
npm ci   # postinstall regenerates src/generated/ from docs/openapi.yaml
npm run lint && npm run typecheck && npm test
# 31 tests, 7 files
```

CI runs the same three jobs plus a `docker compose up` smoke check on every
push — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## What's in the box

```
.
├── api/                  # Laravel 11 — admin & public APIs, evaluator
│   ├── app/
│   │   ├── Services/FeatureFlags/
│   │   │   ├── Evaluator.php             # pure: flag + context → result
│   │   │   ├── FlagCache.php             # stampede-protected, Redis-fallback
│   │   │   ├── DecisionLogger.php        # sampled, per-request buffer
│   │   │   ├── FeatureFlagService.php    # facade for controllers
│   │   │   └── Rules/                    # one Strategy class per rule type
│   │   ├── Http/Controllers/
│   │   │   ├── Admin/FeatureFlagController.php + DecisionLogController.php
│   │   │   └── Api/EvaluationController.php   + DamageReportController.php
│   │   ├── Http/Controllers/Admin/      # FlagController, DecisionLog,
│   │   │                                  Stats, Impersonate, PersonaList
│   │   ├── Http/Middleware/
│   │   │   ├── AdminToken.php            # bearer-token gate, admin API
│   │   │   ├── ForceJsonAccept.php       # API-only JSON content negotiation
│   │   │   └── FlushDecisionLog.php      # terminable: flushes buffered decisions
│   │   ├── Console/Commands/PurgeDecisions.php  # nightly retention
│   │   ├── Models/User.php               # HasApiTokens; role/country attributes
│   │   └── Observers/FeatureFlagObserver.php    # cache invalidation
│   ├── tests/                            # 47 unit + feature tests
│   └── routes/api.php                    # all routes live here
│
├── client/                # Next.js 14 (App Router, TS, Tailwind)
│   ├── kubb.config.ts                    # generates types/zod/client/hooks from the spec
│   ├── src/
│   │   ├── generated/                    # gitignored; produced by `npm run generate`
│   │   ├── lib/flags/
│   │   │   ├── server.ts                 # SSR fetch (used in root layout)
│   │   │   ├── provider.tsx              # client provider, ETag-aware SWR
│   │   │   ├── hooks.ts                  # useFlag / useFlagDecision
│   │   │   ├── FeatureGate.tsx           # <FeatureGate flag="…">
│   │   │   └── types.ts                  # FLAG_KEYS catalogue
│   │   ├── lib/api.ts                    # apiFetch — handles 403 feature_disabled
│   │   ├── lib/kubbClient.ts             # adapter Kubb-generated SDK calls through
│   │   ├── lib/admin-api.ts              # server-only admin fetcher
│   │   ├── lib/validation/               # Zod-backed form schemas
│   │   ├── components/flagged/           # 4 flagged components, 2 features
│   │   ├── components/admin/             # flag form + rule editor
│   │   └── app/                          # routes (reports + admin)
│
├── docs/
│   ├── openapi.yaml                      # contract source (input to Kubb)
│   └── adr/                              # architectural decision records
│
└── docker-compose.yml     # api + redis + client
```

---

## Identity & authentication

Flag rules that key off attributes like `role` are only as trustworthy as
the attributes themselves. A client-asserted role (e.g. `X-User-Role:
staff`) is unenforceable — anyone can claim anything. So identity here is
**server-resolved end-to-end**:

```
                                Browser
                                   │
                                   ▼  POST /api/auth/login {email, password}
                          Next.js /api/auth/login
                                   │
                                   ▼   Authorization passthrough
                          Laravel /api/auth/login
                                   │
                                   ▼   Hash::check + mint Sanctum token
                          Browser ◀──── cookie: ff_auth_token + ff_identity
                                   │
                                   ▼  Authorization: Bearer <user-token>
                          Laravel: auth:sanctum → $request->user()
                                   → EvaluationContext built from the DB
                                     row's role/country, NEVER from headers.
```

Four properties matter:

1. **There is no static admin secret.** `auth:sanctum + admin-role` gates
   every privileged endpoint. The acting user has to be a real `User` row
   with `role = 'admin'`. Non-admin tokens get 403; missing tokens get 401.

2. **Impersonation is itself an admin operation.** Picking a persona from
   the avatar dropdown calls `POST /api/admin/impersonate` using the
   admin's own token. The acting admin's token is _stashed_ by the BFF in
   `ff_admin_token` so "Stop impersonating" can restore it without forcing
   a re-login.

3. **The browser can pretend whatever it wants — the server doesn't care.**
   `X-User-*` headers are gone. Every controller reads `$request->user()`
   and builds the `EvaluationContext` from the DB row. A `customer` who
   sends `X-User-Role: staff` still gets the customer flag set, and
   `bulk-actions` 403s. There's a test covering exactly this case.

4. **Anonymous still works at the API layer.** No token → `$request->user()
=== null` → `EvaluationContext` carries no attributes. Read endpoints
   (flag eval, list reports) succeed and return the anonymous flag set;
   mutating endpoints return 401. The Next.js client itself is gated to
   logged-in users by `middleware.ts` so testers always start at `/login`,
   but the API surface remains usable anonymously for SDK consumers.

### Demo personas

Seeded by `UserSeeder` (idempotent — `updateOrCreate` keyed by email). All
six share the password `password` so the login page can advertise
one-click sign-in across the matrix:

| Email                  | Password   | Role     | Country | Hits                                                                |
| ---------------------- | ---------- | -------- | ------- | ------------------------------------------------------------------- |
| `roy@example.com`      | `password` | admin    | NL      | only persona that can reach `/admin/*` and impersonate others       |
| `mona@example.com`     | `password` | staff    | NL      | `bulk-actions` attribute rule (`role in [staff,admin]`)             |
| `qa.alice@example.com` | `password` | qa       | NL      | `ai-damage-analysis` user_targeting allow-list                      |
| `qa.bob@example.com`   | `password` | qa       | NL      | same                                                                |
| `alice@example.com`    | `password` | customer | NL      | nothing — default-value path                                        |
| `bob@example.com`      | `password` | customer | US      | identical to alice but different country (for future country rules) |

The login page exposes them as one-click "Use" buttons. After signing in
as Roy, the avatar dropdown lets you impersonate any other persona; the
admin's session is stashed and restored when you "Stop impersonating".

### Trade-off worth naming

The Sanctum token cookie is **not `httpOnly`** so the browser-side
`apiFetch` can read it and attach the bearer header. In production this
would move behind a Next.js BFF proxy (browser → same-origin Next.js with
`httpOnly` cookie → Laravel with `Authorization` header forwarded). The
auth model is unchanged; only the storage shape differs.

---

## How feature flags work here

### Schema

A flag has:

- a **master switch** (`enabled`),
- a **default value** (`default_value`) returned when no rule matches,
- an ordered list of **rules** stored as JSON,
- optional **schedule** (`starts_at`, `ends_at`),
- a `deleted_at` column — destroys are soft, so a misclick is recoverable.

### Evaluation

Pure function: `(FeatureFlag, EvaluationContext) → EvaluationResult`. The
engine ([api/app/Services/FeatureFlags/Evaluator.php:14](api/app/Services/FeatureFlags/Evaluator.php:14))
walks four steps:

1. If the master switch is off → `false`, reason `disabled`.
2. If `now` is outside the schedule window → `false`, reason
   `scheduled_not_yet_active` / `scheduled_expired`.
3. Walk rules top-to-bottom; first non-null match wins.
4. Otherwise return `default_value`, reason `default`.

The evaluator has zero side effects — caching, decision logging and HTTP
concerns live one layer up so the engine is trivial to unit-test.

### Rule strategies (the "advanced rollout mechanisms")

Each rule type implements [`Rule`](api/app/Services/FeatureFlags/Rules/Rule.php).
Three are shipped (in addition to the implicit boolean master switch + default):

| Type                 | What it does                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_targeting`     | Allow- or deny-list of user keys (QA accounts, blocklists). The rule's `result` is what callers get when the key matches; anything else abstains. |
| `attribute`          | Match a context attribute with `equals`, `in`, `not_in`, or `contains`. Missing attribute = abstain, so several attribute rules can chain.        |
| `percentage_rollout` | Bucket users into a 0–100 % slice via a stable salted hash.                                                                                       |

**Attribute rule** — gates that depend on something other than identity,
e.g. role, country, plan tier. Seeded example: `bulk-actions` uses
`attribute role in [staff, admin]` so only staff see the bulk-delete bar.

**Percentage rollout** uses `crc32(salt + ":" + userKey) % 10_000` so:

- the same user lands in the same bucket every time (no flicker),
- raising the percentage admits more users _without_ re-shuffling those
  already in the rollout,
- different flags use different salts so rollouts are statistically
  independent (a user in one 10 % rollout isn't more likely to be in
  another),
- anonymous users (no `user_key`) share a single stable bucket per flag:
  with 100 % they all see it, with 0 % they all don't. Randomising per
  request would flip the feature for the same visitor between page loads,
  which is worse UX than a binary shared decision.

Adding a new strategy is three files: a new `Rule` implementation, an entry
in `RuleFactory::registry()`, and (optionally) a validation hint in the
admin UI. No DB changes — rules are stored as JSON.

### Caching strategy (high traffic)

Three-tier:

1. **Application-tier cache** ([FlagCache.php](api/app/Services/FeatureFlags/FlagCache.php)).
   The whole flag set lives behind a single Redis key. Mutations bust it
   via [`FeatureFlagObserver`](api/app/Observers/FeatureFlagObserver.php),
   which covers `saved` / `deleted` / `restored` / `forceDeleted`. The
   cold-cache repopulation is guarded by a `Cache::lock` so a stampede of
   concurrent misses turns into one DB read and N short waits, not N DB
   reads. If Redis is unreachable, we degrade to a direct DB read with
   a warning log rather than 5xx-ing the request.

2. **HTTP cache (ETag + Cache-Control)** on `/api/v1/flags/evaluate`. The
   ETag is `sha1(results + context)` so it varies on both flag state and
   the requesting context — clients send `If-None-Match` and get 304 →
   empty body when nothing has changed. `Cache-Control: private, max-age=N`
   tells browsers and per-user caches to reuse the response for up to
   `FLAG_PUBLIC_RESPONSE_CACHE_SECONDS` (default 15s). We deliberately use
   `private` because the response varies by user — coalescing on a shared
   CDN would leak one user's flag set to another.

3. **Next.js fetch cache + SWR**. The root layout uses Next's tagged
   `revalidate: 15` cache for SSR. Client-side, `useSWR` holds the flag
   set with `revalidateOnFocus + revalidateOnReconnect` and a 60s
   `dedupingInterval` — fully event-driven, no `refreshInterval`. The
   provider also listens for `feature_disabled` 403s on any API call and
   triggers an immediate ETag-aware re-fetch.

Why three tiers and not one: the application cache serves admin reads +
cross-instance consistency, HTTP caching offloads to the browser, and
Next's cache makes the SSR'd HTML cheap to produce. Under steady-state
traffic the DB sees roughly zero requests for flag reads.

### Decision logging

In-memory buffer ([`DecisionLogger`](api/app/Services/FeatureFlags/DecisionLogger.php))
flushed by a terminable middleware ([FlushDecisionLog.php](api/app/Http/Middleware/FlushDecisionLog.php))
in Laravel's `terminate()` phase — so writes happen _after_ the response
has been sent to the client. One request that evaluates six flags is one
bulk `INSERT`, not six.

- `FLAG_DECISION_LOG_SAMPLE_RATE` (0.0–1.0, default 1.0): per-decision
  sample rate, so a high-traffic flag can't dominate the table.
- Failures inside the logger never break flag evaluation — the logger is
  decoupled by design and exceptions during flush are logged and swallowed.
- `php artisan flags:purge-decisions` (scheduled daily at 02:30) trims
  rows older than `FLAG_DECISION_LOG_RETENTION_DAYS` (default 30).

The admin UI exposes recent log + per-reason / per-result aggregates at
`/admin/decisions`, with filtering by flag key.

### Scheduled activations / expirations

The evaluator checks `starts_at` / `ends_at` against `now` on every
request. A flag flips on/off the moment its window opens/closes — no cron
required for correctness. The admin UI surfaces upcoming windows at
`/admin/schedules`.

---

## How the Next.js client uses flags

1. The **root layout** ([client/src/app/layout.tsx](client/src/app/layout.tsx))
   reads the demo identity from a cookie, fetches the flag set
   server-side, and hands it to `<FeatureFlagProvider>` so SSR'd HTML is
   already correct on first paint.
2. The provider ([provider.tsx](client/src/lib/flags/provider.tsx)) holds
   the flags in React context. It revalidates on tab focus / network
   reconnect (rate-limited to one fetch per 60s via SWR's
   `dedupingInterval`) and on a `feature_disabled` 403 from any API
   call. There is no `refreshInterval` — no polling. Most revalidations
   round-trip as a 304 with no body thanks to the ETag.
3. Components consume via [`useFlag`](client/src/lib/flags/hooks.ts) /
   `<FeatureGate>` / `useFlagDecision`. The full decision (value + reason)
   is exposed in the admin's tooltip on the AI badge so you can see
   _why_ a flag is on for the current user.

### The "user clicks a flagged component while the flag was just disabled" case

Handled defensively at two layers — the server is always the authority,
the client UI is a UX nicety:

1. **Server-side enforcement.** The Laravel API endpoints that perform
   the flagged action (e.g. `POST /api/v1/reports/bulk-delete`,
   `POST /api/v1/reports/{id}/export-pdf`) re-evaluate the flag for the
   request's context and return `403 { error: "feature_disabled", flag,
message }` if it's off. UI staleness can never let a feature execute.

2. **Optimistic local rollback.** When the Next.js fetch helper sees a
   `feature_disabled` response, it (a) stamps a local override into the
   provider so the gate flips off immediately for that flag, (b) calls
   `forceRefresh()` to pull the fresh flag set, and (c) throws a typed
   `FeatureDisabledError` the caller can pattern-match on. The user
   sees the feature disappear inside the same click.

Idle tabs (no clicks, no focus changes) may show a stale flag until the
next focus event. That's an explicit trade-off — live push would require
holding a long-lived connection per tab in PHP, which doesn't fit the
runtime. The worst case for a user is "one wasted click" → 403 → UI
catches up.

---

## Demo flags

The seeder creates six flags so reviewers can poke at every code path:

| Key                  | Demonstrates                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `report-photos`      | Plain enabled flag; gates the photo-upload component                                                                                                         |
| `cost-estimate`      | Plain enabled flag; gates the cost panel                                                                                                                     |
| `ai-damage-analysis` | **Percentage rollout (35%) + user_targeting** for QA accounts. Switch to "QA (alice)" in the topbar to force-on, switch personas to see the bucketing change |
| `bulk-actions`       | **Attribute rule** — only `role in [staff, admin]` sees the bulk-delete bar                                                                                  |
| `export-pdf`         | Plain enabled flag; PDF export button                                                                                                                        |
| `maintenance-banner` | Disabled by default — toggle in the admin UI to see the cache invalidate live                                                                                |

---

## Three conditionally rendered components, two conditionally available features

Per the brief — explicit list:

**Components**:

- [`AiDamageAnalysis`](client/src/components/flagged/AiDamageAnalysis.tsx) — beta panel on the report detail page
- [`RepairCostEstimate`](client/src/components/flagged/RepairCostEstimate.tsx) — inline cost estimate
- [`PhotoUploadField`](client/src/components/flagged/PhotoUploadField.tsx) — photo input on the report form
- [`MaintenanceBanner`](client/src/components/flagged/MaintenanceBanner.tsx) — sitewide banner

**Features**:

- Bulk-delete reports — see [`BulkActionsBar`](client/src/components/flagged/BulkActionsBar.tsx) + the
  server route at [`DamageReportController::bulkDestroy`](api/app/Http/Controllers/Api/DamageReportController.php).
- Export-to-PDF — see [`ExportPdfButton`](client/src/components/flagged/ExportPdfButton.tsx) +
  [`DamageReportController::exportPdf`](api/app/Http/Controllers/Api/DamageReportController.php).

---

## API surface

### Public (`Authorization: Bearer <Sanctum user token>` — optional on reads)

| Method | Path                              | Auth         | What                                                                                   |
| ------ | --------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| POST   | `/api/v1/flags/evaluate`          | optional     | Evaluate all flags for the authenticated user (or anon). Returns ETag + Cache-Control. |
| GET    | `/api/v1/reports`                 | optional     | List damage reports                                                                    |
| GET    | `/api/v1/reports/{id}`            | optional     | Show                                                                                   |
| POST   | `/api/v1/reports`                 | **required** | Create. Honours `report-photos`, `cost-estimate`                                       |
| PATCH  | `/api/v1/reports/{id}`            | **required** | Update                                                                                 |
| POST   | `/api/v1/reports/bulk-delete`     | **required** | Gated by `bulk-actions`. 403 if off.                                                   |
| POST   | `/api/v1/reports/{id}/export-pdf` | **required** | Gated by `export-pdf`. 403 if off.                                                     |

User tokens come from `POST /api/auth/login` (or, for an admin who wants
to act as another persona, from `POST /api/admin/impersonate`). Both are
issued by the same `auth:sanctum` middleware on every authed endpoint.

### Auth (no auth required for `/login`)

| Method | Path               | Auth                                | What                                    |
| ------ | ------------------ | ----------------------------------- | --------------------------------------- |
| POST   | `/api/auth/login`  | none (rate-limited 10/min/ip+email) | Email + password → Sanctum token + user |
| POST   | `/api/auth/logout` | sanctum                             | Revoke the current token                |
| GET    | `/api/auth/me`     | sanctum                             | Echo the authenticated user             |

### Admin (`auth:sanctum + admin-role`, i.e. token belongs to a `role=admin` user)

| Method | Path                     | What                                                                        |
| ------ | ------------------------ | --------------------------------------------------------------------------- |
| GET    | `/api/admin/flags`       | List flags                                                                  |
| POST   | `/api/admin/flags`       | Create flag (with full rules JSON)                                          |
| GET    | `/api/admin/flags/{id}`  | Show flag                                                                   |
| PATCH  | `/api/admin/flags/{id}`  | Update                                                                      |
| DELETE | `/api/admin/flags/{id}`  | Soft-delete (recoverable via `withTrashed`)                                 |
| GET    | `/api/admin/decisions`   | Decision log + aggregates. Optional `?flag_key=` filter.                    |
| GET    | `/api/admin/stats`       | Overview counters for the admin sidebar/header                              |
| GET    | `/api/admin/personas`    | Seeded user list for the avatar impersonate dropdown                        |
| POST   | `/api/admin/impersonate` | Mint a fresh Sanctum token for `{email}`. Refuses self-impersonation (422). |

Non-admin users on these endpoints get 403; missing tokens get 401.

### Example: creating a flag with attribute targeting + percentage rollout

```bash
# 1. Sign in as the admin persona.
TOKEN=$(curl -s -X POST http://localhost:8088/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"roy@example.com","password":"password"}' | jq -r .token)

# 2. Create the flag with the admin's token.
curl -X POST http://localhost:8088/api/admin/flags \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "key": "new-checkout",
    "name": "New checkout flow",
    "description": "Staff always-on, gradual rollout to everyone else",
    "enabled": true,
    "default_value": false,
    "rules": [
      { "type": "attribute", "attribute": "role", "operator": "in", "value": ["staff", "admin"], "result": true },
      { "type": "percentage_rollout", "percentage": 5, "salt": "new-checkout", "result": true }
    ]
  }'
```

### Example: evaluating as a real user

```bash
# 1. Sign in as Mona (staff). Role + country come from the DB row, not the request.
TOKEN=$(curl -s -X POST http://localhost:8088/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mona@example.com","password":"password"}' | jq -r .token)

# 2. Evaluate with the user token.
curl -X POST http://localhost:8088/api/v1/flags/evaluate \
  -H "Authorization: Bearer $TOKEN"
```

Response (Mona is `staff`, so the `bulk-actions` attribute rule fires):

```json
{
  "flags": {
    "bulk-actions": { "value": true, "reason": "matched:attribute" },
    "report-photos": { "value": true, "reason": "default" },
    "maintenance-banner": { "value": false, "reason": "disabled" }
  },
  "evaluated_at": "2026-05-14T20:04:48+00:00"
}
```

The browser never asserts a role here — the server reads it from the
authenticated user. Sending `X-User-Role: staff` as a customer changes
nothing: still 403 on bulk-delete, still `bulk-actions: false` on the
eval response.

---

## OpenAPI → Kubb pipeline

The wire contract has one source: [`docs/openapi.yaml`](docs/openapi.yaml).
[Kubb](https://kubb.dev) consumes it and emits four artifacts the client
imports without hand-maintenance:

```
docs/openapi.yaml
       │
       ▼   kubb generate  (runs in pre-{install,build,test,lint,typecheck})
client/src/generated/
├── types/      ← TypeScript interfaces (DamageReport, FeatureFlag, …)
├── zod/        ← Zod schemas (typed: true) — drive form validation
├── client/     ← Typed fetch SDK (listReports(), createReport(), …)
└── hooks/      ← SWR hooks (useListReports(), useCreateReport(), …)
```

The generated dir is **gitignored** — running `npm run generate` is
wired into every entry point that needs it:

| Trigger                                           | What runs                                                      |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `npm install` / `npm ci`                          | `postinstall` → `generate`                                     |
| `npm run dev`                                     | `predev` → `generate`                                          |
| `npm run build`                                   | `prebuild` → `generate`                                        |
| `npm test` / `npm run typecheck` / `npm run lint` | `pre*` → `generate`                                            |
| Docker `client` image                             | builder stage runs `npm run build`, which fires `prebuild`     |
| GitHub Actions `client` job                       | `npm ci` (postinstall) and an explicit `npm run generate` step |

The generated SDK functions don't ship a fetch client of their own — they
delegate to [`client/src/lib/kubbClient.ts`](client/src/lib/kubbClient.ts),
a thin adapter that:

- Attaches the Sanctum bearer token from the cookie.
- Converts a `403 feature_disabled` response into a `FeatureDisabledError`
  and emits a `flag_event` so the FeatureFlagProvider can flip the local
  override.
- Surfaces validation errors as typed `ApiError` instances.

That keeps the auth + flag-event behaviour in one place; Kubb gets a
typed wrapper for free and the rest of the codebase imports SDK functions
without ever touching `fetch` directly.

### What the forms actually use

- The [new-report form schema](client/src/lib/validation/damageReport.ts)
  defines a Zod schema in the same shape as the generated
  `storeDamageReportSchema`. When the OpenAPI spec changes, the next
  `npm run generate` produces new types that the form validator sits
  alongside; the typecheck catches drift.
- The [`validate()` / `validateField()` helpers](client/src/lib/validation/schema.ts)
  are tiny wrappers over Zod's `safeParse` that return a `{ ok, errors }`
  union the form hooks pattern-match on — the API stayed stable when we
  swapped the engine.

### Why not Kubb's SWR hooks for everything?

The plugin is wired up and the hooks are generated, but most data-fetching
in this app is _server-side_: the reports list is rendered by a Server
Component using `lib/reports.ts`, and the public flag-evaluate endpoint
has bespoke ETag/304 handling that doesn't fit a vanilla SWR template.
The hooks are available for future client-side endpoints (e.g. an
admin-side polling view) without further wiring.

### Calibration

The generated tree is roughly **500 KB across 124 files**. Bundle impact
is dominated by Zod (~13 KB gzipped) — the schemas themselves are noise.
Tree-shaking ensures only the SDK functions actually imported make it
into the production bundle.

---

## Notable design choices

- **Validation as a single source of truth.** Every write goes through a
  Form Request (`FeatureFlagRequest`, `StoreDamageReportRequest`,
  `UpdateDamageReportRequest`, `BulkDeleteReportsRequest`). The rule
  factory's `RuleFactory::fromArray()` is invoked inside the Form
  Request's `withValidator` hook, so the _same_ code path validates and
  evaluates rules — "if it persists, it evaluates" is enforced by
  construction, not by convention. On the client, the form validation
  rules are derived from the OpenAPI spec via Kubb's generated Zod
  schemas (see "OpenAPI → Kubb pipeline" below).

- **API Resources, not raw model serialisation.** Every response goes
  through a `JsonResource` (`FeatureFlagResource`, `DamageReportResource`),
  so the wire format is decoupled from the Eloquent column shape. Adding
  a column doesn't accidentally leak it; renaming a column doesn't break
  clients. ISO 8601 dates are formatted at the resource layer, not the
  model.

- **One contract source: OpenAPI → Kubb → typed client.** The wire shape
  lives in [`docs/openapi.yaml`](docs/openapi.yaml). Kubb generates the
  client-side TypeScript types, Zod schemas, typed fetch SDK, and SWR
  hooks into `client/src/generated/` (gitignored, regenerated on every
  install/build via the `pre*` lifecycle hooks). The generated SDK calls
  through [`kubbClient.ts`](client/src/lib/kubbClient.ts) — a thin wrapper
  on top of `apiFetch` — so cookie auth, the 403 `feature_disabled`
  handling, and the flag event bus all stay in one place. Forms get their
  validation rules from the generated Zod schemas, so when the spec
  changes, both the request types _and_ the form rules update on next
  `npm run generate`. See the OpenAPI → Kubb pipeline section below.

- **JSON-encoded rules, not per-strategy tables.** Adding a new strategy
  is one file. The downside (no DB-level integrity on rule shape) is
  bounded by the validation-on-write path that runs every payload through
  the same factory the evaluator uses — so "if it persists, it evaluates."
  ADR-0001 covers the trade-off in full.

- **Sanctum personal-access tokens for both user and admin identity.**
  Every privileged endpoint runs `auth:sanctum + admin-role`; "admin" is
  a column on the `users` table, not a static service credential. Login,
  impersonation, and admin operations all flow through the same Sanctum
  middleware, so attribute rules can always trust `$request->user()`.

- **Single-key cache + flush-on-write** rather than per-flag keys with
  tags. The flag set is small (kilobytes) and a cold rebuild is fast;
  this eliminates an entire class of "stale flag" bugs that come with
  partial invalidation.

- **Cache stores raw attribute arrays, not serialised models.** Persisting
  `Eloquent` instances through Redis pickles the whole model graph and
  becomes brittle across framework or PHP upgrades. The cache holds the
  attribute arrays and rehydrates on read via `Model::newFromBuilder`,
  which is what Laravel itself does internally.

- **Decision log is sampled + buffered + post-response.** Synchronous
  writes after `terminate()` keep the user off the latency path and turn
  N evaluations into one bulk insert. The same `DecisionLogger` interface
  could be swapped for `dispatch(new LogDecisionJob(…))` if load grows
  past a single instance.

- **Admin operations route through Next.js `app/api/admin/*` handlers.**
  Admin pages call same-origin Next.js endpoints
  ([client/src/app/api/admin/flags/route.ts](client/src/app/api/admin/flags/route.ts))
  that forward the user's Sanctum token to Laravel. There is no
  service-credential plumbing — every admin call is the admin's own
  authenticated session. `middleware.ts` blocks non-admin browsers from
  reaching `/admin/*` in the first place; the API's `admin-role`
  middleware is the defense-in-depth check behind it.

---

## Configuration knobs

All in `api/.env` (or the compose file's environment block):

| Var                                  | Default                                       | What                                               |
| ------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES`   | `60`                                          | TTL of minted user tokens                          |
| `FLAG_CACHE_TTL`                     | `900`                                         | Redis cache TTL for the flag set (s)               |
| `FLAG_CACHE_LOCK_TTL`                | `5`                                           | Max lock hold time during cache repopulation (s)   |
| `FLAG_CACHE_LOCK_WAIT`               | `3`                                           | Max time other workers wait on the lock (s)        |
| `FLAG_PUBLIC_RESPONSE_CACHE_SECONDS` | `15`                                          | `Cache-Control: max-age` for the public eval API   |
| `FLAG_DECISION_LOG_SAMPLE_RATE`      | `1.0`                                         | 0.0–1.0 sampling rate for decision-log writes      |
| `FLAG_DECISION_LOG_RETENTION_DAYS`   | `30`                                          | Days kept by `flags:purge-decisions`               |
| `FLAG_EVALUATE_RATE_LIMIT`           | `60`                                          | Requests/minute/user (or IP) for `/flags/evaluate` |
| `FRONTEND_ORIGIN`                    | `http://localhost:3000,http://localhost:3030` | Comma-separated CORS allow-list                    |

`APP_KEY` is **not** in this table on purpose: the API entrypoint
auto-generates one on first run and persists it on the SQLite volume so it
survives container restarts. The repo never ships a known key. To pin a
specific value, set `APP_KEY` in the compose env block; the entrypoint
defers to whatever's already exported.

---

## Scaling — what changes at higher tiers

Single-instance is already good for a few thousand QPS. Beyond that:

**~1k QPS (single instance, hot day):**

- `Tier 1` Redis cache absorbs all flag reads; only mutations touch the
  DB. No changes needed.
- Decision logger's per-request buffer + bulk INSERT keeps write cost
  bounded. If the table grows, raise `FLAG_DECISION_LOG_SAMPLE_RATE`
  trade-off (e.g. `0.1` keeps 1-in-10 decisions); the aggregates remain
  representative.

**~10k QPS (multi-instance, single region):**

- Swap the in-process `DecisionLogger` flush for `dispatch(new
LogDecisionJob(…))`. The interface stays the same; what changes is
  _where_ the bulk INSERT runs (queue worker rather than the web
  process). Worker autoscales independently.
- Make `FlagCache` cross-instance consistent on mutation by publishing
  a Redis pub/sub event in `FeatureFlagObserver`; each instance
  subscribes and busts its local Tier 1.
- Promote the decision log table to its own DB with separate retention
  policies — its write pattern is append-only / age-partitioned, which
  a primary DB shouldn't pay for.

**~100k QPS (multi-region):**

- Tier 1 becomes a per-region read replica with a single writer region.
  Pub/sub becomes a regional fan-out from the writer.
- Public `/flags/evaluate` moves behind a same-origin BFF that maintains
  a per-user cache keyed by the Sanctum token id, so the heaviest tier
  is `Cache-Control: private` honoured by a per-user edge cache.
- The decision log moves to a stream (Kafka / Redpanda) with a periodic
  rollup into the aggregate table. The admin UI reads the rollup.

What stays the same across all of these: **the evaluator is pure**
(`(FeatureFlag, EvaluationContext) → EvaluationResult`), the rule shape
is JSON, the auth model is server-resolved. The scaling changes are all
in the layers _around_ the evaluator.

---

## Further reading in `docs/`

- [`docs/openapi.yaml`](docs/openapi.yaml) — full OpenAPI 3.0 spec.
- [`docs/adr/0001-json-encoded-rules.md`](docs/adr/0001-json-encoded-rules.md) — why rules are a JSON column, not a polymorphic table.
- [`docs/adr/0002-server-resolved-identity.md`](docs/adr/0002-server-resolved-identity.md) — why identity attributes come from the DB row, never headers.
- [`docs/adr/0003-three-tier-caching.md`](docs/adr/0003-three-tier-caching.md) — what each cache tier solves and why they're independent.
