# Testing guide

A reviewer-focused walkthrough: how to drive the demo, which feature each rule
controls, and what every persona can see and do. Pair this with the [README](README.md)
for the architecture story.

> Want to skip to the punch line? Jump to the [persona matrix](#persona--feature-access-matrix).

---

## Prerequisites

```bash
docker compose up -d --build
```

- App: <http://localhost:3000> — redirects to `/login` for new sessions
- Admin: <http://localhost:3000/admin/flags> — admin role required
- Decision log: <http://localhost:3000/admin/decisions> — admin role required

The login page (`/login`) lists every demo persona with a **Use →** button
that fills the form and submits in one click. All personas share the
password `password`. Sign in as **Roy (admin)** first to see the full app
including `/admin/*` and the persona-impersonation menu.

Once signed in, the top-right **avatar dropdown** is the home for
identity actions:
- For an admin: an "Impersonate" submenu lists every other persona.
  Picking one calls `/api/admin/impersonate`, swaps the active session,
  and stashes the admin's token so "Stop impersonating" restores it
  without re-login.
- For everyone: a "Log out" item that revokes the current Sanctum
  token and bounces back to `/login`.

Every flag evaluation runs against the active session's **DB-stored**
attributes — the browser can't lie about role or country.

---

## Rule strategies

Four strategies are implemented. Every flag in the seed data uses at least one
of them — the table below shows which.

| Strategy | What it does | Where to look |
|---|---|---|
| **`boolean`** (implicit) | Master switch (`enabled`) plus `default_value` returned when no other rule matches. This is the implicit "feature on for everyone" path. | `Evaluator.php` — early returns + the final `default` return |
| **`user_targeting`** | Allow- or deny-list of `user_key` values. The user_key is the user's email; matches fire the configured `result`. | [`UserTargetingRule.php`](api/app/Services/FeatureFlags/Rules/UserTargetingRule.php) |
| **`attribute`** | Match a context attribute (`role`, `country`, …) with `equals` / `not_equals` / `in` / `not_in` / `contains`. Missing attribute = abstain, so several attribute rules can chain. | [`AttributeRule.php`](api/app/Services/FeatureFlags/Rules/AttributeRule.php) |
| **`percentage_rollout`** | Bucket users 0–100% by `crc32(salt + ":" + user_key) % 10_000`. Same user → same bucket forever, so increasing the percentage admits new users without re-shuffling existing ones. Anonymous traffic shares a single stable bucket. | [`PercentageRolloutRule.php`](api/app/Services/FeatureFlags/Rules/PercentageRolloutRule.php) |

Plus an orthogonal **schedule window** (`starts_at` / `ends_at`) checked at evaluation time — see [Schedules](#schedule-windows-orthogonal-to-the-above).

### Evaluation order

For every request the evaluator runs:

1. `enabled === false` → `false` (`reason: disabled`)
2. Outside schedule window → `false` (`reason: scheduled_not_yet_active` / `scheduled_expired`)
3. Walk rules top-to-bottom; **first non-null match wins** (`reason: matched:<type>`)
4. Otherwise return `default_value` (`reason: default`)

---

## Feature ↔ rule map

The six seeded flags, each driving something visible in the app:

| Flag key | Gates | Strategy | Notes |
|---|---|---|---|
| `report-photos` | Photo upload field on the new-report form | `boolean` (enabled, default `true`) | Drop the master switch in admin → next request loses the photo input + the server silently drops any photos the client tries to submit. |
| `cost-estimate` | Inline repair-cost panel on the report detail page | `boolean` (enabled, default `true`) | Same story — toggle in admin to see it appear/disappear. |
| `export-pdf` | "Export PDF" button on each report | `boolean` (enabled, default `true`) | Server-enforced: clicking with the flag off returns `403 feature_disabled`, `apiFetch` flips the local gate, the button disappears immediately. |
| `maintenance-banner` | Sitewide banner above the layout | `boolean` (**disabled** by default) | Off in the seed so you can toggle it on and watch the Redis cache invalidate live — `FeatureFlagObserver` flushes the key on every save. |
| `bulk-actions` | Bulk-delete checkboxes + bar on the reports list, plus the `POST /api/v1/reports/bulk-delete` route | `attribute` — `role in [staff, admin]`, otherwise `default_value: false` | **The security test:** a customer who sends `X-User-Role: staff` still gets blocked, because the server reads role from the DB row, not the header. |
| `ai-damage-analysis` | "AI damage assessment" panel on the report detail page (with rollout-reason badge) | `user_targeting` (QA accounts) → `percentage_rollout` 35% → `default: false` | Demonstrates first-rule-wins ordering. QA users hit the user_targeting branch; other emails fall through to the 35% bucket. |

---

## Persona × feature access matrix

The seeder creates six users plus the anonymous case. Every cell below was
queried against the live `/api/v1/flags/evaluate` endpoint — the
parenthesised value is the `reason` field returned.

| Persona | role / country | `report-photos` | `cost-estimate` | `export-pdf` | `maintenance-banner` | `bulk-actions` | `ai-damage-analysis` |
|---|---|---|---|---|---|---|---|
| **Anonymous** (no token) | — | ✅ default | ✅ default | ✅ default | ❌ disabled | ❌ default | ❌ default |
| **Alice** `alice@example.com` | customer / NL | ✅ default | ✅ default | ✅ default | ❌ disabled | ❌ default | ❌ default |
| **Bob** `bob@example.com` | customer / US | ✅ default | ✅ default | ✅ default | ❌ disabled | ❌ default | ✅ **matched:percentage_rollout** |
| **QA — Alice** `qa.alice@example.com` | qa / NL | ✅ default | ✅ default | ✅ default | ❌ disabled | ❌ default | ✅ **matched:user_targeting** |
| **QA — Bob** `qa.bob@example.com` | qa / NL | ✅ default | ✅ default | ✅ default | ❌ disabled | ❌ default | ✅ **matched:user_targeting** |
| **Mona** `mona@example.com` | staff / NL | ✅ default | ✅ default | ✅ default | ❌ disabled | ✅ **matched:attribute** | ✅ **matched:percentage_rollout** |
| **Roy** `roy@example.com` | admin / NL | ✅ default | ✅ default | ✅ default | ❌ disabled | ✅ **matched:attribute** | ❌ default |

### Why the AI-damage column splits the way it does

`ai-damage-analysis` is the most interesting flag because it chains two rules:

1. `user_targeting [qa.alice, qa.bob]` → guarantees QA always sees it.
2. `percentage_rollout 35%` → everyone else lands in or out based on the
   deterministic hash `crc32("ai-damage-analysis:" + email) % 10000 < 3500`.

For the seeded emails: **Bob** and **Mona** hash *into* the 35% window; **Alice**
and **Roy** fall *outside* it. **Anonymous** users share a single stable bucket
that also lands outside. Raising the rollout to 100% in the admin UI flips
the whole "default" column to ✅ matched:percentage_rollout.

### Mutating actions

Read endpoints (flag eval, list reports) tolerate anonymous callers; mutating
endpoints require a real token. Combined with the flag rules:

| Action | Anon | Customer (Alice/Bob) | QA | Staff (Mona) | Admin (Roy) |
|---|---|---|---|---|---|
| `POST /api/v1/reports` (submit) | ❌ 401 | ✅ | ✅ | ✅ | ✅ |
| `PATCH /api/v1/reports/{id}` | ❌ 401 | ✅ | ✅ | ✅ | ✅ |
| `POST /api/v1/reports/bulk-delete` | ❌ 401 | ❌ 403 `feature_disabled` | ❌ 403 | ✅ | ✅ |
| `POST /api/v1/reports/{id}/export-pdf` | ❌ 401 | ✅ | ✅ | ✅ | ✅ |

The 401 vs 403 distinction matters: 401 says "you have no identity";
403 `feature_disabled` says "we know who you are, but your flag set
doesn't allow this." The browser's `apiFetch` treats them differently —
the latter triggers an immediate UI rollback so the disabled control
disappears without a manual refresh.

---

## What to actually try

Suggested order — five minutes covers every code path.

### 1. "The bulk-delete gate is real" (security demo, 60s)

1. Open <http://localhost:3000>. You arrive anonymous.
2. Click **Demo flags** → **Alice (Customer NL)**. Notice the bulk-delete
   checkboxes are absent.
3. Open dev tools → Network. Switch to **Mona (Staff)**. The page reloads,
   bulk-delete checkboxes appear, and a request to `/api/v1/flags/evaluate`
   shows `bulk-actions.reason = "matched:attribute"`.
4. Switch back to Alice. Open the Network tab and replay the previous
   bulk-delete request **but add the header `X-User-Role: staff`**. It
   still 403s with `feature_disabled` — the server ignores the header and
   reads role from the DB user.

This is the headline security property: client-asserted attributes can't
flip the gate.

### 2. "First rule wins" (ai-damage-analysis, 90s)

1. As anonymous, the AI damage panel is hidden (`reason: default`).
2. Switch to **QA — Alice**. The panel appears with badge "user_targeting"
   — first rule fired.
3. Switch to **Bob (Customer US)**. The panel still appears, but badge
   reads "percentage_rollout" — second rule fired this time.
4. Switch to **Alice (Customer NL)**. Panel disappears. Hash lands outside
   the 35% bucket; default of `false` wins.
5. Open `/admin/flags`, find `ai-damage-analysis`, drag the rollout slider
   to **100%**, save. Reload as Alice — the panel now reappears via
   `matched:percentage_rollout`.

### 3. "Cache invalidates on focus" (maintenance banner)

1. Open `/admin/flags` in one tab, the reports view in another.
2. In admin, toggle `maintenance-banner` **Enabled** on, save.
3. Click back to the reports tab. SWR revalidates on focus → the orange
   maintenance banner appears.
4. Toggle off. Refocus the reports tab — banner disappears.

The cache key is busted by `FeatureFlagObserver` on every save; the
public eval response has an ETag so on-focus revalidations return 304
when nothing changed (cheap). There is no polling — an idle tab won't
update until you click into it.

### 4. "Decisions are recorded" (observability, 60s)

1. Click around as a few different personas.
2. Open `/admin/decisions`. The aggregate counters (Total / True / False)
   reflect every evaluation made since the API started.
3. Click a reason badge to filter — e.g. `matched:attribute` shows only
   the staff/admin requests that hit `bulk-actions`.
4. The table shows the user_key, the resolved flag, and the matched
   reason. Sample rate is configurable via
   `FLAG_DECISION_LOG_SAMPLE_RATE`.

### 5. "Schedule a flag" (optional, 30s)

1. Edit any flag in the admin UI. Set `starts_at` to two minutes from now.
2. Save and immediately evaluate the flag — `reason: scheduled_not_yet_active`,
   value `false`.
3. Wait two minutes. Without restarting anything, the flag flips on at
   the boundary — the evaluator checks `now()` on every request.

---

## Schedule windows (orthogonal to the above)

`starts_at` / `ends_at` work on top of *any* rule combination. A flag with
`enabled: true`, `default_value: true`, and `starts_at` in the future will
still evaluate to `false` until the window opens — at which point its rules
take effect normally. The admin **Schedules** tab lists every flag with a
non-null window.

---

## Where to look when something seems off

| Symptom | First thing to check |
|---|---|
| Persona swap "doesn't take" | Open dev tools → Application → Cookies. `ff_auth_token` and `ff_identity` should reflect the persona you picked; `ff_admin_token` and `ff_admin_identity` hold the admin's stashed session while impersonating. |
| Flag evaluation seems wrong | `/admin/decisions` filtered by your flag key — the `reason` field is the authoritative answer for why a flag returned what it did. |
| API returns 401 unexpectedly | Your Sanctum token expired (default TTL: 60 min). The Next.js root layout's `/api/auth/me` check will detect this on the next page load and redirect you to `/login`. |
| `/admin/*` redirects you to `/` | Your active session isn't an admin. Sign in as Roy or use the avatar dropdown to stop impersonating. The API also enforces this with 403 if you bypass the client guard. |
| Stale flag value after toggling | Click the affected feature (a 403 `feature_disabled` triggers a refresh) or refocus the tab (SWR revalidates on focus). The browser cache holds the prior payload until one of those events fires. |

---

## Running the test suite

The PHP test suite covers every rule type, the cache layer, the decision
logger, the impersonate endpoint, and the "client can't spoof role" property.

```bash
docker run --rm -v "$(pwd)/api:/app" -w /app composer:2 \
  sh -c "composer install --no-interaction --prefer-dist && php vendor/bin/phpunit"
# 47 tests, 127 assertions
```
