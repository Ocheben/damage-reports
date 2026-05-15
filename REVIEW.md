# Implementation review

This is a walk-through of the codebase, mapped to each requirement in the
brief. It also lists the changes made during this review pass.

## What this app is

Two services, talking over HTTP:

- **`api/`** — Laravel 11. Owns the flag definitions, the evaluator, the
  decision log, and the Car Damage Reports CRUD that the flags gate.
- **`client/`** — Next.js 14 (App Router, TypeScript, Tailwind). The
  customer-facing reports app + the admin UI for managing flags.

Redis backs the flag cache. SQLite is the system of record (any RDBMS would
work — there's nothing SQLite-specific in the code). A scheduler container
runs `php artisan schedule:run` once a minute.

```
.
├── api/          # Laravel 11
├── client/       # Next.js 14
└── docker-compose.yml
```

---

## Requirements coverage

### Admin & API

| Requirement | Where it lives |
|---|---|
| Create / view / edit / delete flags | [`Admin/FeatureFlagController`](api/app/Http/Controllers/Admin/FeatureFlagController.php), routed at `POST/GET/PATCH/DELETE /api/admin/flags[/{id}]` |
| Advanced rollout in addition to boolean | Three rule strategies: [`UserTargetingRule`](api/app/Services/FeatureFlags/Rules/UserTargetingRule.php), [`AttributeRule`](api/app/Services/FeatureFlags/Rules/AttributeRule.php), [`PercentageRolloutRule`](api/app/Services/FeatureFlags/Rules/PercentageRolloutRule.php). Boolean is the implicit default when no rule matches. |
| API endpoint for the client to query statuses | [`POST /api/v1/flags/evaluate`](api/app/Http/Controllers/Api/EvaluationController.php) — returns the full flag set for a `(user_key, attributes)` context, with ETag + `Cache-Control` |

**Rule strategies in detail:**

- `user_targeting` — explicit allow/deny by user key. Used for QA accounts.
- `attribute` — match a context attribute with `equals`, `not_equals`,
  `in`, `not_in`, or `contains`. Used in the demo to gate
  `bulk-actions` to `role in [staff, admin]`.
- `percentage_rollout` — stable hash bucket. `crc32(salt + ':' + userKey) %
  10_000` with a 0.01% resolution. Same user always lands in the same
  bucket, so raising the percentage admits more users without
  reshuffling those already in the rollout. Different flags use
  different salts so independent rollouts stay statistically
  independent.

Rules are evaluated top-to-bottom, first non-null match wins, falling
through to `default_value` if none match. A flag is short-circuited to
`false` when the master `enabled` switch is off or the request is outside
the schedule window. See [`Evaluator::evaluate`](api/app/Services/FeatureFlags/Evaluator.php:11).

**Add a new strategy in three changes:**

1. Implement `Rule` (one new file in [`Rules/`](api/app/Services/FeatureFlags/Rules)).
2. Register it in [`RuleFactory::registry()`](api/app/Services/FeatureFlags/Rules/RuleFactory.php:11).
3. Add a validator branch in [`StoreFeatureFlagRequest::validateRuleShape`](api/app/Http/Requests/StoreFeatureFlagRequest.php:60).

No DB changes — rules persist as JSON.

### Client

The Car Damage Reports app lives in [`client/src/app/(client)`](client/src/app/(client)).

| Requirement | Where it lives |
|---|---|
| Submit a new report | [`/reports/new`](client/src/app/(client)/reports/new/NewReportForm.tsx) — also intercepted as a modal on `/` via the `@modal` parallel slot |
| View an existing report | Master-detail [`ReportsWorkspace`](client/src/app/(client)/ReportsWorkspace.tsx) + [`ReportDetailPanel`](client/src/components/reports/ReportDetailPanel.tsx) |
| Update an existing report | Inline-editable description in `ReportDetailPanel`, plus a "Cancel report" action that PATCHes the status |

**Three conditionally rendered components, two flagged features:**

Components:

- [`MaintenanceBanner`](client/src/components/flagged/MaintenanceBanner.tsx) (`maintenance-banner`)
- [`PhotoUploadField`](client/src/components/flagged/PhotoUploadField.tsx) (`report-photos`)
- [`RepairCostEstimate`](client/src/components/flagged/RepairCostEstimate.tsx) (`cost-estimate`)
- [`AiDamageAnalysis`](client/src/components/flagged/AiDamageAnalysis.tsx) (`ai-damage-analysis`)

Features:

- Bulk delete — [`BulkActionsBar`](client/src/components/flagged/BulkActionsBar.tsx) + server-side gate at [`DamageReportController::bulkDestroy`](api/app/Http/Controllers/Api/DamageReportController.php:53) (`bulk-actions`).
- Export to PDF — [`ExportPdfButton`](client/src/components/flagged/ExportPdfButton.tsx) + server-side gate at [`DamageReportController::exportPdf`](api/app/Http/Controllers/Api/DamageReportController.php:65) (`export-pdf`).

### Generic

#### Disabled flag + user interaction

Two layers — server is the authority, client UI is a UX nicety:

1. **Server-side enforcement** ([`DamageReportController`](api/app/Http/Controllers/Api/DamageReportController.php)). The
   write endpoints re-evaluate the relevant flag for the request's
   context. Photos and `estimated_cost` are stripped silently if their
   flags are off; `bulk-delete` and `export-pdf` 403 with a structured
   `feature_disabled` body. UI staleness can never let a feature execute.

2. **Optimistic local rollback.** When [`apiFetch`](client/src/lib/api.ts:44) sees the
   `feature_disabled` 403 it (a) flips the local override in the
   provider so the gate disappears immediately for that flag, (b) calls
   `forceRefresh()` to pull the fresh flag set, and (c) throws a typed
   `FeatureDisabledError` callers can match on. Worst case the user sees
   one wasted click — the UI then catches up inside the same click.

The client cache is otherwise event-driven only: SWR revalidates on tab
focus and network reconnect (rate-limited via `dedupingInterval`), so an
idle tab may show a stale flag until the user looks at it again. Any
attempt to *use* a disabled feature is caught by the 403 path above.

#### Caching for high-traffic usage

Three tiers — each one shrinks the work of the layer below:

1. **Redis flag cache** ([`FlagCache`](api/app/Services/FeatureFlags/FlagCache.php)). The whole flag set
   lives behind one key. Mutations bust it via [`FeatureFlagObserver`](api/app/Observers/FeatureFlagObserver.php).
   The hot path uses `Cache::lock` so a cold cache under heavy load
   doesn't stampede the database — only one worker repopulates while
   the others wait briefly. If Redis is down, requests fall back to the
   DB and a warning is logged.

2. **HTTP cache (ETag + `Cache-Control`)** on `/api/v1/flags/evaluate`
   ([`EvaluationController`](api/app/Http/Controllers/Api/EvaluationController.php)). The ETag combines a hash of the
   flag set and the request context; CDN / browser / `fetch` caches can
   serve unchanged responses for `FLAG_PUBLIC_RESPONSE_CACHE_SECONDS`
   (default 15s). The Next.js client sends `If-None-Match` and gets a
   304 with no body when nothing has changed.

3. **Next.js fetch cache + SWR** ([`fetchFlagsServerSide`](client/src/lib/flags/server.ts), [`FeatureFlagProvider`](client/src/lib/flags/provider.tsx)). The root
   layout uses Next's tagged `revalidate: 15` cache for SSR. On the
   client, SWR re-validates every 30 s and on focus, also via ETag.

Net effect: under steady traffic, the database sees roughly zero flag reads.

#### Scheduled activations and expirations

Two complementary pieces:

- **At evaluation time.** [`FeatureFlag::isWithinSchedule`](api/app/Models/FeatureFlag.php:54) is checked
  on every request. A flag flips on/off the moment its window opens or
  closes — no cron required for correctness.
- **For observability.** [`flags:emit-schedule-events`](api/app/Console/Commands/EmitScheduleEvents.php)
  runs every minute (via the scheduler container) and writes a one-shot
  decision-log row when a window has just opened or closed. Gives oncall
  a discrete event to alert on instead of having to spot "first
  evaluation that landed after the boundary."

#### Decision logging (the optional one)

[`DecisionLogger`](api/app/Services/FeatureFlags/DecisionLogger.php) — sampled writes (rate set by
`FLAG_DECISION_LOG_SAMPLE_RATE`, default 1.0 in dev). Best-effort: a
logging failure never fails an evaluation. The admin UI surfaces the
recent log + per-reason / per-result aggregates at
[`/admin/decisions`](client/src/app/admin/decisions/page.tsx)
and at the audit tab on [`/admin/flags`](client/src/app/admin/flags/AdminWorkspace.tsx).
[`flags:purge-decisions`](api/app/Console/Commands/PurgeDecisionLogs.php) runs nightly to keep the table
bounded (default 30-day retention).

### Non-functional

| Requirement | What we did |
|---|---|
| Laravel for admin + API | Laravel 11 in `api/` |
| Next.js for the client | Next.js 14 (App Router) in `client/` |
| Any database | SQLite for the demo (zero setup); the queries use Eloquent so swapping is one env change |
| No ready-made flag SDKs (Pennant etc.) | Verified — `composer.json` has none. Evaluator, rule strategies, cache, decision log, and schedule logic are all hand-written. |

---

## Walk-through, file by file

### API — engine

- [`Evaluator`](api/app/Services/FeatureFlags/Evaluator.php) —
  pure function `(FeatureFlag, EvaluationContext) → EvaluationResult`. No
  side effects, no caching, no logging. Trivial to unit-test (see
  [`EvaluatorTest`](api/tests/Unit/EvaluatorTest.php)).
- [`EvaluationContext`](api/app/Services/FeatureFlags/EvaluationContext.php),
  [`EvaluationResult`](api/app/Services/FeatureFlags/EvaluationResult.php) —
  small immutable value objects.
- [`Rules/`](api/app/Services/FeatureFlags/Rules) —
  one `Rule` interface, one `RuleOutcome`, one `RuleFactory`, three
  strategy implementations.
- [`FlagCache`](api/app/Services/FeatureFlags/FlagCache.php) —
  Redis-backed, stampede-protected, with a DB fallback if Redis is
  unavailable.
- [`DecisionLogger`](api/app/Services/FeatureFlags/DecisionLogger.php) —
  sampled, best-effort writes to `feature_flag_decisions`.
- [`FeatureFlagService`](api/app/Services/FeatureFlags/FeatureFlagService.php) —
  thin facade composing the cache, evaluator, and logger so controllers
  call one method.
- [`FeatureFlagObserver`](api/app/Observers/FeatureFlagObserver.php) —
  flushes the cache on every flag mutation.

### API — HTTP

- [`Api/EvaluationController`](api/app/Http/Controllers/Api/EvaluationController.php)
  — the hot path. ETag + `Cache-Control`, serves the per-user flag set
  in one round trip.
- [`Api/DamageReportController`](api/app/Http/Controllers/Api/DamageReportController.php)
  — CRUD + the two flagged features (`bulkDestroy`, `exportPdf`). Uses
  the FFS to gate behaviour server-side.
- [`Admin/FeatureFlagController`](api/app/Http/Controllers/Admin/FeatureFlagController.php)
  — flag CRUD. Validation runs every payload through `RuleFactory`, so
  "if it persists, it evaluates."
- [`Admin/DecisionLogController`](api/app/Http/Controllers/Admin/DecisionLogController.php),
  [`Admin/StatsController`](api/app/Http/Controllers/Admin/StatsController.php)
  — observability surfaces.
- [`Middleware/AdminToken`](api/app/Http/Middleware/AdminToken.php),
  [`Middleware/PublicToken`](api/app/Http/Middleware/PublicToken.php)
  — `hash_equals`-based bearer auth. Static for the demo; the route
  group is the only thing to swap when wiring an IdP.
- [`Requests/StoreFeatureFlagRequest`](api/app/Http/Requests/StoreFeatureFlagRequest.php)
  — flag + per-rule validation, normalisation through the factory.

### API — console

- [`Console/Commands/EmitScheduleEvents`](api/app/Console/Commands/EmitScheduleEvents.php)
  — minute-level heartbeat for schedule-window transitions, idempotent.
- [`Console/Commands/PurgeDecisionLogs`](api/app/Console/Commands/PurgeDecisionLogs.php)
  — nightly retention.
- [`routes/console.php`](api/routes/console.php) — schedules
  the two commands.

### Client — flag library

- [`lib/flags/types.ts`](client/src/lib/flags/types.ts) — wire types and a
  `FLAG_KEYS` catalogue so a typo becomes a compile error.
- [`lib/flags/server.ts`](client/src/lib/flags/server.ts) — server-side
  fetch, used in the root layout. Fail-open on errors so a flag-service
  outage never blanks the page.
- [`lib/flags/provider.tsx`](client/src/lib/flags/provider.tsx) — React
  context, ETag-aware SWR fetcher, optimistic-disabled overrides, and
  the window-globals that `apiFetch` uses to flip flags on a 403.
- [`lib/flags/hooks.ts`](client/src/lib/flags/hooks.ts) — `useFlag`,
  `useFlagDecision`, `useFlagsRefresh`.
- [`lib/flags/FeatureGate.tsx`](client/src/lib/flags/FeatureGate.tsx) —
  declarative wrapper for conditional subtrees, with optional fallback.

### Client — networking

- [`lib/api.ts`](client/src/lib/api.ts) — browser-side fetch wrapper.
  Stamps the active demo identity onto every request, parses
  `feature_disabled` 403s into a typed error and triggers the
  optimistic flip-off.
- [`lib/admin-api.ts`](client/src/lib/admin-api.ts) — `server-only`
  helper that forwards the active user's Sanctum cookie when calling
  `/api/admin/*`. The browser only ever sees same-origin Next.js Route
  Handlers in [`app/api/admin/*`](client/src/app/api/admin); the API
  itself enforces admin authorization via `auth:sanctum + admin-role`.

### Client — pages

Customer side ([`app/(client)`](client/src/app/(client))):

- [`page.tsx`](client/src/app/(client)/page.tsx) — entry point that fetches
  reports and renders `ReportsWorkspace`.
- [`ReportsWorkspace`](client/src/app/(client)/ReportsWorkspace.tsx) —
  master-detail with tabs, search, bulk-select.
- [`reports/new`](client/src/app/(client)/reports/new) — page form +
  modal interception via the `@modal` parallel route.
- [`reports/[id]`](client/src/app/(client)/reports/[id]/page.tsx) —
  legacy URL → redirects into the workspace with `?selected=`.

Admin side ([`app/admin`](client/src/app/admin)):

- [`flags/page.tsx`](client/src/app/admin/flags/page.tsx) — fetches flags
  + stats + decisions in parallel and hands them to `AdminWorkspace`.
- [`AdminWorkspace`](client/src/app/admin/flags/AdminWorkspace.tsx) —
  three-tab dashboard (All flags / Analytics / Audit).
- [`flags/[key]`](client/src/app/admin/flags/[key]/page.tsx),
  [`flags/new`](client/src/app/admin/flags/new/page.tsx) — the create /
  edit flag form, sharing a single [`FlagForm`](client/src/components/admin/FlagForm.tsx)
  + [`RuleEditor`](client/src/components/admin/RuleEditor.tsx).
- [`schedules`](client/src/app/admin/schedules/page.tsx),
  [`decisions`](client/src/app/admin/decisions/page.tsx) — supporting
  surfaces. `audiences` and `evaluations` are placeholder pages
  ([`ComingSoon`](client/src/components/admin/ComingSoon.tsx)) that
  signal where future iterations would land.

### Tests

[`tests/`](api/tests):

- [`EvaluatorTest`](api/tests/Unit/EvaluatorTest.php) — 9 unit tests
  covering disabled flags, defaults, each rule type, scheduling
  windows, anonymous bucketing, and percentage-rollout distribution.
- [`FeatureFlagApiTest`](api/tests/Feature/FeatureFlagApiTest.php) — 10
  feature tests covering admin auth, validation, CRUD, ETag 304s, ETag
  invalidation on flag change, and subset filtering.
- [`DamageReportApiTest`](api/tests/Feature/DamageReportApiTest.php) — 6
  feature tests covering report creation, the photo / cost / AI gates,
  the bulk-delete 403 path, and the bulk-delete attribute-rule path.

`27 tests, 64 assertions — all green.`

---

## Changes made during this review

The implementation was already structured well — the bulk of changes were
trimming verbose docblocks. Specifically:

1. **Fixed broken test setup** — `phpunit.xml` was using `<env>` blocks
   for the test tokens, but `Env::getRepository()` reads `$_SERVER`
   first, so the docker-compose env vars masked the test values. Switched
   to `<server force="true">` entries. `27 tests, 64 assertions` now pass
   with `docker compose exec api php vendor/bin/phpunit`.

2. **Trimmed every comment that explained WHAT the code did.** The
   remaining comments are short and answer WHY:
   - `EvaluationContext::bucketingKey` — anonymous traffic shares a bucket so users don't flicker.
   - `PercentageRolloutRule::bucketFor` — `crc32` is non-cryptographic but uniform and fast.
   - `AttributeRule::scalarEquals` — loose compare for admin-form string values.
   - `PublicToken` — admin tokens implicitly satisfy public access.
   - `EmitScheduleEvents` — idempotency marker.
   - `FlagCache::all` Redis-down fallback.
   - `apiFetch` ambient identity, `ETagUnchangedError` sentinel, window-globals justification.

3. **Removed `client/src/components/layout/TopBar.tsx`** — dead code,
   replaced by `SiteHeader.tsx` + `AppSwitcherBar.tsx`. Verified with a
   grep that nothing imported it.

4. **Cleaned up empty docblocks** in `AppServiceProvider` and the closure
   inside `bootstrap/app.php`.

5. **Added a few short WHY comments** where the original code had a
   useful inline rationale that I'd otherwise have lost in the trim
   (e.g. the silent-drop behaviour in `applyFeatureGates`, the schedule
   activation comment in `EmitScheduleEvents`).

The cuts kept the code self-explanatory through structure and identifier
names, not prose. Where genuine non-obvious "why" remained, it stayed —
on its own one-line `//` comment, not as a multi-paragraph docblock.

---

## Running it

```bash
docker compose up -d --build
cd client && cp .env.local.example .env.local && npm install && npm run dev
```

- App: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/flags>
- Decision log: <http://localhost:3000/admin/decisions>
- API health: <http://localhost:8088/up>

Tests:

```bash
docker compose exec api php vendor/bin/phpunit
# 27 tests, 64 assertions
```

The "Demo flags" pill in the dark utility bar lets you switch between
`anonymous` / `customer` / `qa-alice` / `staff-mona`. Watch the AI panel's
`Detected damage` block, the bulk-action bar, and the AI rollout badge
react as the persona changes — they're all driven by live flag
evaluations against the chosen identity.
