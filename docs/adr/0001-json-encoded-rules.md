# ADR-0001 — JSON-encoded rules, not per-strategy tables

**Status:** Accepted
**Date:** 2026-05-08

## Context

Each feature flag carries an ordered list of *rules*. Each rule type has a
different shape:

- `user_targeting` — array of user keys.
- `attribute` — attribute name, operator, value (scalar or array), result.
- `percentage_rollout` — percentage, salt, result.

We had to decide where rules live in the database.

## Options considered

1. **One column per rule type** (denormalised) — `targeting_user_keys`,
   `percentage`, `salt`, etc. Adding a new strategy means a migration plus
   a new nullable column set.
2. **Polymorphic table per strategy** — `feature_flag_rules` →
   `targeting_rules`, `attribute_rules`, `percentage_rules`. Adding a new
   strategy means a migration plus a new table plus a join.
3. **JSON column on the flag** — `feature_flags.rules` stores the entire
   ordered rule array. Adding a new strategy is one PHP class +
   `RuleFactory` registry entry; no DB changes.

## Decision

Option 3 — a single JSON `rules` column.

## Consequences

**Positive:**
- Adding a new strategy is three files: a new `Rule` implementation, an
  entry in `RuleFactory::registry()`, and a UI editor case. No migration,
  no rollouts that lock the table, no double-deploys.
- Order is intrinsic — JSON arrays preserve insertion order. The evaluator
  walks rules top-to-bottom and takes the first non-null verdict; the
  storage layer doesn't have to enforce ordering separately.
- The cache layer serialises one row per flag; the rule shape is just
  another part of that row.

**Negative:**
- No DB-level integrity on rule shape. Mitigated by the validation-on-write
  path: every payload runs through `RuleFactory::fromArray()` (the same
  factory the evaluator uses), so "if it persists, it evaluates."
- Can't index a particular rule property (e.g. "find all flags targeting
  user X"). Acceptable because flag count is in the hundreds, not millions.
- Schema migrations for rules are application-level. A `RuleFactory` that
  fills in defaults for missing fields is the established way to handle
  this — old rows keep working, new rows get the richer shape.

## Re-evaluation triggers

We should revisit this if:
- The number of flags grows past ~10k (the linear scan over rules-per-flag
  starts to matter for some queries).
- We need to query *across* rules ("which flags target country=NL?") for
  admin tooling. Right now that need doesn't exist.
- We add a rule type that legitimately needs DB-level uniqueness or
  foreign-key constraints (none of the current three do).
