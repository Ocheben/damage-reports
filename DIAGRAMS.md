# Architecture at a glance

Open this file in a Mermaid-aware viewer (VS Code preview, GitHub, Cursor).

---

## 1. The whole system

```mermaid
flowchart LR
  Browser([Browser])
  Next[Next.js client<br/>:3000]
  API[Laravel API<br/>:8088]
  R[(Redis)]
  DB[(SQLite)]

  Browser -->|HTTP| Next
  Next -->|public: eval + reports| API
  Next -.->|admin token, server-only proxy| API
  API <-->|Cache::remember| R
  API <-->|Eloquent| DB
```

- [`api/`](api) — Laravel 11. Owns flags + reports.
- [`client/`](client) — Next.js 14 (App Router).
- Redis caches the whole flag set behind **one** key.
- SQLite is the system of record.

---

## 2. Backend layout

```mermaid
flowchart TD
  Routes[routes/api.php]

  Routes --> Eval[Api/EvaluationController]
  Routes --> Reports[Api/DamageReportController]
  Routes --> Admin[Admin/FeatureFlagController]
  Routes -.AdminToken middleware.-> Admin

  Admin --> Req[FeatureFlagRequest<br/>validation]
  Eval --> Svc[FeatureFlagService]
  Reports --> Svc

  Svc --> Cache[(Redis cache)]
  Svc --> Eng[Evaluator]
  Svc --> Model[FeatureFlag model]

  Eng --> Rules[Rules/]
  Rules --> Pct[PercentageRolloutRule]
  Rules --> User[UserTargetingRule]
```

| Layer | File |
|---|---|
| HTTP | [`Admin/FeatureFlagController`](api/app/Http/Controllers/Admin/FeatureFlagController.php), [`Api/EvaluationController`](api/app/Http/Controllers/Api/EvaluationController.php), [`Api/DamageReportController`](api/app/Http/Controllers/Api/DamageReportController.php) |
| Auth | [`AdminToken`](api/app/Http/Middleware/AdminToken.php) middleware (bearer token) |
| Validation | [`FeatureFlagRequest`](api/app/Http/Requests/FeatureFlagRequest.php) (handles create + update) |
| Service | [`FeatureFlagService`](api/app/Services/FeatureFlags/FeatureFlagService.php) — cache + evaluator facade |
| Engine | [`Evaluator`](api/app/Services/FeatureFlags/Evaluator.php) — pure: `(flag, context) → result` |
| Rules | [`Rule`](api/app/Services/FeatureFlags/Rules/Rule.php), [`RuleFactory`](api/app/Services/FeatureFlags/Rules/RuleFactory.php), [`PercentageRolloutRule`](api/app/Services/FeatureFlags/Rules/PercentageRolloutRule.php), [`UserTargetingRule`](api/app/Services/FeatureFlags/Rules/UserTargetingRule.php) |
| Models | [`FeatureFlag`](api/app/Models/FeatureFlag.php), [`DamageReport`](api/app/Models/DamageReport.php) |

---

## 3. The hot path — flag evaluation

```mermaid
sequenceDiagram
  participant C as Browser
  participant N as Next.js
  participant API as Laravel
  participant R as Redis
  participant DB as SQLite

  C->>N: page load (cookie: user_key)
  N->>API: POST /api/v1/flags/evaluate { user_key }
  API->>R: GET feature-flags:all
  alt cache hit
    R-->>API: flag set
  else cache miss
    API->>DB: SELECT * FROM feature_flags
    DB-->>API: rows
    API->>R: SET + 900s TTL
  end
  loop each flag
    API->>API: Evaluator.evaluate(flag, ctx)
  end
  API-->>N: { flags, ETag, Cache-Control: 15s }
  N-->>C: SSR'd HTML, gates already correct

  Note over C,N: SSE-driven, not polling
  API-->>N: event: changed (via GET /flags/stream, Redis pub/sub)
  N->>API: POST /flags/evaluate (If-None-Match: ETag)
  API-->>N: 304 Not Modified (or fresh body if this user's eval changed)
```

---

## 4. Inside the evaluator

```mermaid
flowchart TD
  Start([evaluate flag, context]) --> En{flag.enabled?}
  En -- no --> Dis[/false, reason: disabled/]
  En -- yes --> Sc{within starts_at..ends_at?}
  Sc -- no --> Out[/false, reason: scheduled_*/]
  Sc -- yes --> Rl{any rule matches?}
  Rl -- yes, first match --> Rm[/verdict, reason: matched:type/]
  Rl -- none match --> Df[/default_value, reason: default/]
```

The two rule types:

```mermaid
flowchart LR
  subgraph UserTargeting
    UT["user_keys: [qa-alice, qa-bob]<br/>result: true"]
  end
  subgraph PercentageRollout
    PR["bucket = crc32(salt:user_key) % 10_000<br/>match if bucket < percentage*100"]
  end
```

- [`UserTargetingRule`](api/app/Services/FeatureFlags/Rules/UserTargetingRule.php) — allow-list match
- [`PercentageRolloutRule`](api/app/Services/FeatureFlags/Rules/PercentageRolloutRule.php) — stable hash bucket (same user → same bucket forever)

---

## 5. How the Next.js client uses flags

```mermaid
flowchart LR
  Layout[root layout.tsx] -->|SSR fetch| Provider[FeatureFlagProvider]
  Provider -->|context| Hook[useFlag<br/>FeatureGate]
  Hook --> UI[Flagged component]
  API -. SSE: event: changed .-> Provider
  Provider -. ETag-aware re-fetch .-> API[/api/v1/flags/evaluate/]
  UI -. user clicks .-> Backend[Laravel route]
  Backend -- flag off --> E403[403 feature_disabled]
  E403 -. flag event bus .-> Provider
  Provider -. local override + refresh .-> Hook
```

Three layers of defence when a flag flips off mid-session:

1. **UI** — gate disappears within one RTT of the admin write (SSE push)
2. **Server** — re-evaluates per request, returns `403 feature_disabled`
3. **Client** — `apiFetch` catches the 403, flips local override **now**, kicks a refresh

Worst case = one wasted click.

---

## 6. Database schema

```mermaid
erDiagram
  feature_flags {
    int id PK
    string key UK
    string name
    text description
    boolean enabled "master kill switch"
    boolean default_value "when no rule matches"
    json rules "ordered list of rule objects"
    timestamp starts_at "schedule window start"
    timestamp ends_at "schedule window end"
    timestamps created_updated
  }
  damage_reports {
    int id PK
    string reference UK
    string reporter_name
    string reporter_email
    string vehicle_registration
    string damage_type
    string severity
    text description
    json photos "gated by report-photos flag"
    decimal estimated_cost "gated by cost-estimate flag"
    string status
    timestamps created_updated
  }
```

The two tables are **independent**. Flags don't reference reports; reports don't reference flags. The controller evaluates flags per request and either silently drops fields (photos, cost) or 403s the action (bulk-delete, export-pdf).

---

## 7. API surface

```mermaid
flowchart LR
  subgraph Public [no auth]
    P1[POST /api/v1/flags/evaluate]
    P2[GET /api/v1/reports]
    P3[POST /api/v1/reports]
    P4[GET /api/v1/reports/:id]
    P5[PATCH /api/v1/reports/:id]
    P6[POST /api/v1/reports/bulk-delete]
    P7[POST /api/v1/reports/:id/export-pdf]
  end
  subgraph Admin [Bearer ADMIN_API_TOKEN]
    A1[GET /api/admin/flags]
    A2[POST /api/admin/flags]
    A3[GET /api/admin/flags/:id]
    A4[PATCH /api/admin/flags/:id]
    A5[DELETE /api/admin/flags/:id]
  end
```

---

## 8. The six demo flags

| Key | Type | Demonstrates |
|---|---|---|
| `report-photos` | boolean | Silent server-side drop when off |
| `cost-estimate` | boolean | Silent server-side drop when off |
| `ai-damage-analysis` | **user_targeting + percentage_rollout** | QA cohort always-on, everyone else in 35% rollout |
| `bulk-actions` | boolean | 403 server gate on action |
| `export-pdf` | boolean | 403 server gate on action |
| `maintenance-banner` | boolean, scheduled | Demonstrates `starts_at`/`ends_at` |
