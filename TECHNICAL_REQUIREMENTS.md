# Technical Requirements

Mapping each requirement in the assessment brief to its implementation. File paths are clickable; line numbers point to the load‑bearing code.

---

## Admin & API

### 1. CRUD for feature flags

Five REST endpoints behind `auth:sanctum` + `admin-role` middleware. A single Eloquent model carries all flag state; soft‑deletes preserve audit trail.

| Verb     | Route                   | Method                                                                                              |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/admin/flags`      | [`index`](api/app/Http/Controllers/Admin/FeatureFlagController.php)                                 |
| `POST`   | `/api/admin/flags`      | [`store`](api/app/Http/Controllers/Admin/FeatureFlagController.php)                                 |
| `GET`    | `/api/admin/flags/{id}` | [`show`](api/app/Http/Controllers/Admin/FeatureFlagController.php)                                  |
| `PATCH`  | `/api/admin/flags/{id}` | [`update`](api/app/Http/Controllers/Admin/FeatureFlagController.php)                                |
| `DELETE` | `/api/admin/flags/{id}` | [`destroy`](api/app/Http/Controllers/Admin/FeatureFlagController.php)                               |

Model: [`FeatureFlag`](api/app/Models/FeatureFlag.php) — `key`, `name`, `enabled`, `default_value`, `rules` (JSON), `starts_at`, `ends_at`. Routes registered at [api/routes/api.php:74](api/routes/api.php:74).

---

### 2. Advanced rollout mechanisms

Three rule types compose freely on a flag — first non‑null verdict wins, then the flag's `default_value` is the fallback.

```
flag.enabled? ──no──▶ false
       │ yes
       ▼
within schedule? ──no──▶ false (scheduled_not_yet_active | scheduled_expired)
       │ yes
       ▼
for each rule (in order):
   UserTargetingRule        ── user_key in list?         ─▶ verdict
   AttributeRule            ── attr matches operator?    ─▶ verdict
   PercentageRolloutRule    ── stable hash bucket < pct? ─▶ verdict
       │ no rule matched
       ▼
   default_value
```

Implemented in [`Rule.php`](api/app/Services/FeatureFlags/Rules/Rule.php) + [`RuleFactory`](api/app/Services/FeatureFlags/Rules/RuleFactory.php). Evaluation pipeline: [`Evaluator::evaluate`](api/app/Services/FeatureFlags/Evaluator.php:14).

**Percentage rollout** uses a stable hash so the same user always lands in the same bucket — raising 10% → 20% admits new users without flipping existing ones:

```php
// api/app/Services/FeatureFlags/Rules/PercentageRolloutRule.php:39
$bucket = crc32($this->salt.':'.$key) % self::RESOLUTION;  // 10_000
return $bucket < $threshold ? $this->result : null;
```

**User targeting** — explicit allowlist by `user_key`. See [`UserTargetingRule`](api/app/Services/FeatureFlags/Rules/UserTargetingRule.php).
**Attribute rule** — match on `role`, `country`, etc. with `equals`/`in`/`not_in`. See [`AttributeRule`](api/app/Services/FeatureFlags/Rules/AttributeRule.php).

---

### 3. Client evaluation endpoint

```
POST /api/v1/flags/evaluate
  ├─ Optional Sanctum token (anonymous traffic also works)
  ├─ Server resolves user_key + attributes from User model (never trusts client claims)
  ├─ Throttled 60/min/user via `throttle:flag-evaluate`
  └─ Returns { flag_key: { value, reason } } + ETag
```

[`EvaluationController`](api/app/Http/Controllers/Api/EvaluationController.php:15) evaluates every flag in one call so the client gets the whole flag set in a single round‑trip.

---

## Client (Next.js)

### 4. Damage Reports UI

Submit, list, view, edit — all wired against `/api/v1/reports`.

| Action | Component                                                                                       | API                              |
| ------ | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| Submit | [`NewReport`](client/src/components/Reports/NewReport)                                          | `POST /api/v1/reports`           |
| List   | [`ReportsList`](client/src/app/(client)/ReportsList.tsx) — filter by status/severity/search    | `GET  /api/v1/reports`           |
| View   | [`ReportDetailPanel`](client/src/components/Reports/ReportDetailPanel.tsx)                      | `GET  /api/v1/reports/{id}`      |
| Update | same panel — inline status/description edit                                                     | `PATCH /api/v1/reports/{id}`     |

---

### 5. Conditionally rendered components & flagged features

Six flag keys, all in one centralised type so a typo is a compile error:

```ts
// client/src/lib/flags/types.ts:18
export const FLAG_KEYS = {
  reportPhotos:       "report-photos",      // component
  costEstimate:       "cost-estimate",      // component
  aiDamageAnalysis:   "ai-damage-analysis", // component
  maintenanceBanner:  "maintenance-banner", // component
  bulkActions:        "bulk-actions",       // feature
  exportPdf:          "export-pdf",         // feature
} as const;
```

**4 conditionally rendered components** (≥3 required) — wrapped in `<FeatureGate>`:

- [`PhotoUploadField`](client/src/components/Flagged/PhotoUploadField) — file upload in new‑report form
- [`RepairCostEstimate`](client/src/components/Flagged/RepairCostEstimate) — estimate input + display
- [`AiDamageAnalysis`](client/src/components/Flagged/AiDamageAnalysis) — AI analysis CTA
- [`MaintenanceBanner`](client/src/components/Flagged/MaintenanceBanner) — site‑wide banner

**2 conditional features** (≥2 required) — full interaction flows:

- [`BulkActionsBar`](client/src/components/Flagged/BulkActionsBar) — multi‑select + bulk delete
- [`ExportPdfButton`](client/src/components/Flagged/ExportPdfButton) — generate report PDF

The gate is a thin one‑liner over a hook so any consumer can pick the more ergonomic form:

```tsx
// client/src/lib/flags/FeatureGate.tsx
<FeatureGate flag={FLAG_KEYS.reportPhotos}>
  <PhotoUploadField />
</FeatureGate>

// or, when you need the value imperatively
const enabled = useFlag(FLAG_KEYS.exportPdf);
```

---

## Generic

### 6. Disabled‑flag interaction (defense in depth)

Client hiding a button isn't enough — the server must reject the call too, and the client must catch up if state diverges.

```
[Admin disables flag]
       │
       ├──▶ Cache::forget on flag write  ┐
       │                                  │  next /flags/evaluate returns new set
       ▼                                  ▼
[Client A — fresh tab]              [Client B — stale UI, button still visible]
   button hidden                       user clicks → POST /reports/bulk-delete
                                       Laravel re-evaluates flag → 403 feature_disabled
                                                          │
                                       client/src/lib/api-fetch catches 403
                                                          │
                                       emits feature_disabled event
                                                          │
                                       provider sets local override → UI hides instantly
                                       triggers forceRefresh() → SWR re-fetches
```

Server check ([`DamageReportController`](api/app/Http/Controllers/Api/DamageReportController.php:68)):

```php
public function bulkDestroy(BulkDeleteReportsRequest $request): JsonResponse {
    if (! $this->isFlagOn($request, 'bulk-actions')) {
        return $this->featureDisabled('bulk-actions'); // 403
    }
    // ...
}
```

Field‑level gating on writes — drops `photos`/`estimated_cost` from the payload before persist ([`applyFeatureGates`](api/app/Http/Controllers/Api/DamageReportController.php:95)).

Client recovery ([`provider.tsx:140`](client/src/lib/flags/provider.tsx:140)):

```tsx
if (event.type === "feature_disabled") {
  setOverrides((prev) => ({
    ...prev,
    [event.flag]: { value: false, reason: "client_override:disabled" },
  }));
}
```

---

### 7. Caching strategy for high traffic

Three‑layer cache; under steady load every read is O(1) and never touches the DB.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Client (Next.js)                                                    │
│   SWR `flags` key, dedupingInterval: 60s, revalidateOnFocus/recon   │
│   ETag stored in module scope → If-None-Match → 304 short-circuits  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/v1/flags/evaluate
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ HTTP response cache                                                 │
│   ETag = sha1(results + context)                                    │
│   Cache-Control: private, max-age=15, must-revalidate               │
│   304 on If-None-Match match → empty body                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ on cache miss
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Redis flag-set cache (`feature-flags:all`)                          │
│   Distributed lock prevents stampede on cold cache                  │
│   Stores attribute arrays, not pickled models                       │
│   Falls back to DB if Redis is unreachable (logs once, never 5xx)   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ on miss / Redis down
                               ▼
                          [ Database ]
```

Stampede protection ([`FlagCache::all`](api/app/Services/FeatureFlags/FlagCache.php:32)):

```php
$lock = Cache::lock(FeatureFlag::CACHE_KEY.':lock', $this->lockTtl);
if ($lock->block($this->lockWait)) {
    // double-check cache; another worker may have populated it
    // exactly one worker hits the DB, others read what it wrote
}
```

Writes invalidate via `FlagCache::forget` from the admin controller, so admin edits propagate at the next evaluate call.

---

### 8. Scheduled activations & expirations

Two nullable timestamp columns on `feature_flags`, evaluated at request time before any rules run:

```php
// api/app/Models/FeatureFlag.php:59
public function isWithinSchedule(CarbonImmutable $now): bool {
    if ($this->starts_at !== null && $now->lt($this->starts_at)) return false;
    if ($this->ends_at   !== null && $now->gt($this->ends_at))   return false;
    return true;
}
```

The evaluator distinguishes the two cases so logs are useful:

```php
// api/app/Services/FeatureFlags/Evaluator.php:22
$reason = $flag->starts_at !== null && $now->lt($flag->starts_at)
    ? 'scheduled_not_yet_active'
    : 'scheduled_expired';
```

Admin schedule UI: [`client/src/app/admin/schedules`](client/src/app/admin/schedules).

---

### 9. Decision logging & visualisation *(optional)*

Logs sampled, buffered in memory, flushed in **one bulk INSERT per request** *after* the response is sent (Laravel's `terminate` lifecycle) — the user never waits on the log.

```
request → evaluate flag A → buffer.push(decision)
       → evaluate flag B → buffer.push(decision)
       → send response to user
       → FlushDecisionLog middleware runs:
            FeatureFlagDecision::insert($buffer)  // one bulk INSERT
```

Logger: [`DecisionLogger`](api/app/Services/FeatureFlags/DecisionLogger.php). Failures are swallowed with a warning — the log must never break evaluation.

**Visualisation**: `/admin/decisions` aggregates by result and reason (default vs. scheduled vs. matched:percentage_rollout vs. matched:user_targeting, etc.).

- API: [`DecisionLogController`](api/app/Http/Controllers/Admin/DecisionLogController.php) returns `data` + `aggregates`
- UI: [`page.tsx`](client/src/app/admin/decisions/page.tsx), [`DecisionsStats`](client/src/app/admin/decisions/DecisionsStats.tsx), [`DecisionReasonBreakdown`](client/src/app/admin/decisions/DecisionReasonBreakdown.tsx), [`DecisionsLogTable`](client/src/app/admin/decisions/DecisionsLogTable.tsx)

---

## Non‑functional

| Requirement              | Choice          | Notes                                                                                               |
| ------------------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| Backend framework        | Laravel 11      | PHP 8.3, Sanctum for auth                                                                           |
| Client framework         | Next.js 15      | App Router, TypeScript, SWR                                                                         |
| Database                 | SQLite (default) | MySQL/Postgres/MariaDB supported — see [`config/database.php:19`](api/config/database.php:19)       |
| Cache                    | Redis           | Falls back to in‑memory array if unreachable                                                        |
| No Pennant / equivalent  | ✓               | All evaluation custom: [`FeatureFlagService`](api/app/Services/FeatureFlags/FeatureFlagService.php), [`Evaluator`](api/app/Services/FeatureFlags/Evaluator.php), rule classes |

---

## Options considered

### Why no polling or SSE for realtime flag propagation

A realtime channel was the obvious extension — admin toggles a flag, every connected client sees the change in seconds. It was deliberately left out. The cost/value math doesn't work out, and the server‑side enforcement already covers the only case where staleness actually matters.

**Polling.** With N concurrent users and a 5s interval, the API takes `N / 5` requests/second purely for flag state — most returning 304s for hours at a time. Scaling that means more app workers and more Redis ops to satisfy the polling, all to shave seconds off a propagation window that no user perceives.

```
1,000 concurrent users × 1 req/5s = 200 req/s of pure overhead
                                  → 99%+ of those return 304 "nothing changed"
```

**SSE.** One open TCP connection per tab, holding a PHP‑FPM worker (or a separate long‑lived process) for the session's entire lifetime. On a stack sized for short request/response, SSE either starves the worker pool or forces a parallel architecture (Swoole, Reverb, a Node sidecar) just to hold idle sockets. The infrastructure cost is real; the user‑facing benefit is "a flag toggle reflects in 2s instead of 60s."

**What was chosen instead** — event‑driven revalidation, no persistent channel:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Trigger                              │ Latency to flag update       │
├──────────────────────────────────────┼──────────────────────────────┤
│ Page navigation / mount              │ immediate (SSR fetch)        │
│ Tab regains focus                    │ ≤ 60s (SWR dedupe window)    │
│ Network reconnect                    │ immediate                    │
│ Login / impersonate                  │ immediate (forceRefresh)     │
│ User clicks a stale-disabled feature │ immediate (403 → override)   │
│ Otherwise idle                       │ stale until any of the above │
└──────────────────────────────────────┴──────────────────────────────┘
```

Most revalidations come back as a 304 with no body (ETag match) — the wire cost is a few hundred bytes for a check that would have cost an open TCP connection under SSE.

### Why staleness is safe — the server is the authority

The worry behind realtime updates is "user sees a button that's now disabled, clicks it, executes a feature that was just turned off." That can't happen here, because every flagged write re‑evaluates the flag server‑side before doing the work:

```
Client UI is stale ──▶ user clicks disabled feature ──▶ POST /reports/bulk-delete
                                                              │
                       FeatureFlagService::evaluate('bulk-actions', ctx)
                                                              │
                                                  ┌───────────┴───────────┐
                                                  ▼                       ▼
                                              enabled                  disabled
                                                  │                       │
                                            perform action       403 feature_disabled
                                                                          │
                                              client catches 403 → hides UI instantly
                                              triggers forceRefresh → flag set converges
```

See [`bulkDestroy`](api/app/Http/Controllers/Api/DamageReportController.php:68) and [`exportPdf`](api/app/Http/Controllers/Api/DamageReportController.php:79) — the flag is checked on every call, not cached on the session. Field‑level gating is the same: `photos` and `estimated_cost` are stripped from write payloads server‑side if their flags are off, regardless of what the client sent.

This inverts the usual realtime argument: realtime updates are valuable when the client *acts on* the data optimistically and a mismatch causes incorrect behaviour. Here the client only *renders* the data, and every action that depends on a flag asks the server fresh — so a 60‑second visual lag at worst produces a momentarily stale button, never a wrong execution.

### Other options considered

| Option                                 | Rejected because                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Laravel Pennant                        | The brief forbids ready‑made flag packages — and writing the implementation from scratch is the interesting part of the task. |
| One endpoint per flag                  | N round‑trips per page load. Batch evaluate keeps it to one.                                                  |
| Cache evaluation results (not flag set) | Result cache key has to encode the full user context — huge cardinality, low hit rate. Caching the flag set is O(flags) and the evaluator runs in microseconds. |
| WebSocket admin push                   | Same cost profile as SSE, more code, identical benefit. Skipped for the same reason.                          |
| Cron‑driven scheduling                 | Requires a worker to scan flags every minute. Instead, `starts_at`/`ends_at` are evaluated inline — zero infra, correct to the second. |
| Synchronous decision log writes        | Adds one INSERT per flag evaluation to the hot path. Buffer + flush after response gives the same data for free. |

---

## Deliverable

- Public repository contains both `api/` (Laravel) and `client/` (Next.js) codebases.
- Running instructions: [`README.md`](README.md) — docker‑compose one‑liner plus manual steps.
- Test suites: [`api/tests`](api/tests) (PHPUnit), [`client/src`](client/src) (Vitest). See [`TESTING.md`](TESTING.md).
