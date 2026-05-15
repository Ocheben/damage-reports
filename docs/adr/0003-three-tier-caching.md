# ADR-0003 — Three-tier caching strategy for flag reads

**Status:** Accepted
**Date:** 2026-05-09

## Context

The PDF spec calls for a caching strategy that supports high-traffic usage.
Naive caching gets you most of the way but has three classic failure modes:

1. **Cache stampede** — N concurrent requests on a cold cache all hit the
   DB at once.
2. **Stale data** — admin toggles a flag, but the cached value lives on
   for the TTL window.
3. **No client-side caching** — every page load fetches the flag set from
   scratch even if nothing has changed.

We needed a strategy that handles all three without coupling them.

## Decision

Three independent tiers, each solving one of the three problems:

### Tier 1 — Application-tier cache (Redis, with stampede lock)

The entire flag set lives behind a single key (`feature-flags:all`). On
miss, exactly one worker acquires a Redis lock, reads from the DB, and
populates the cache. Other workers `block(3)` on the lock and then read
the value the winning worker just wrote.

Mutations through the admin API trigger `FeatureFlagObserver`, which
flushes the key (`saved`, `deleted`, `restored`, `forceDeleted`). Single
key = simple invalidation. The flag set is kilobytes; cold rebuild is
fast.

If Redis is unreachable we fall through to a DB read with a warning log
rather than 5xx'ing.

### Tier 2 — HTTP cache (ETag + Cache-Control)

`POST /api/v1/flags/evaluate` returns:

- `ETag: "<sha1(results+context)>"` — varies on flag state *and* the
  requesting context, so two users get distinct ETags.
- `Cache-Control: private, max-age=15, must-revalidate` — `private` is
  intentional. The response varies by user; a shared CDN cache would
  leak one user's flag set to another.

Clients send `If-None-Match: <etag>` on subsequent polls and get
`304 Not Modified` with an empty body when nothing has changed. Saves a
round-trip's worth of work per poll.

### Tier 3 — Next.js fetch cache + SWR

The root layout uses Next.js's tagged fetch cache (`revalidate: 15`,
`tags: ["feature-flags"]`) so the SSR'd HTML reuses the same flag set
across renders within the window.

Client-side, `useSWR` revalidates every 30s and on focus, also via ETag.
The provider holds the last known flag set so stale-while-revalidate is
free.

## Why these three and not one bigger cache

- Tier 1 is *server-of-truth* cache. Without it we hit the DB.
- Tier 2 is *transport* cache. Without it every poll is a full round-trip.
- Tier 3 is *render* cache. Without it SSR is expensive.

They're orthogonal: Tier 2 still helps when Tier 1 is warm (saves the
JSON serialisation cost), Tier 3 still helps when Tier 2 is warm (saves
the network entirely for repeated SSR renders).

Under steady-state traffic the DB sees roughly zero requests for flag
reads — Tier 1 absorbs everything until a mutation happens.

## Consequences

**Positive:**
- O(1) reads in steady state.
- Stampede-safe under concurrent cold-miss load.
- Sub-millisecond eval responses for unchanged flag sets (304 path).
- Mutations propagate within seconds (Observer flushes Tier 1; Tier 2
  expires within 15s; Tier 3 revalidates on the next poll).

**Negative:**
- Three places to debug if a value goes stale. Documented here so the
  next engineer doesn't have to spelunk.
- The 15s `max-age` is a hard upper bound on how fast a flag change
  propagates to a tab that hasn't focused. The provider's `useSWR`
  refresh interval (30s) is an even harder one. For *immediate* feedback
  we'd add a server-sent-events channel; for the demo's threat model the
  current latency is acceptable.

## Re-evaluation triggers

- Going multi-region: Tier 1 needs Redis pub/sub on the mutation path so
  the second region's cache invalidates too. Single-region works as-is.
- Going past a single Redis: the cache key shape stays the same; what
  changes is the invalidation primitive (pub/sub or a logical change
  number bumped on mutation, with reads opting into the latest).
