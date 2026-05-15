# ADR-0002 — Server-resolved identity, not client-asserted attributes

**Status:** Accepted
**Date:** 2026-05-12

## Context

Attribute rules (`role in [staff, admin]`, `country = NL`, etc.) only mean
something if the attributes themselves are trustworthy. An earlier draft of
this service exposed identity through request headers — `X-User-Email`,
`X-User-Role`, `X-User-Country`. The Next.js layer set them based on the
selected persona; Laravel read them straight into `EvaluationContext`.

That works as a *demo* — but it's also the classic "we trust the client"
mistake. A customer who knows the header name can grant themselves the
staff flag set with a single curl invocation. For an interview submission,
shipping that pattern is signalling that we don't take the threat model
seriously.

## Decision

Identity is **always** server-resolved.

1. The Next.js server holds a static admin token (env var, never inlined
   into the bundle).
2. Persona selection in the browser hits `/api/identity` (Next.js route
   handler), which calls `POST /api/admin/impersonate` on Laravel using
   the admin token. Laravel mints a fresh Sanctum personal-access token
   for that user and returns it.
3. The browser receives the user token in a cookie. Subsequent requests
   carry `Authorization: Bearer <user-token>`.
4. Laravel resolves the user via `auth:sanctum`, reads role/country from
   the DB row, and builds `EvaluationContext` from there — never from
   request headers.

A client sending `X-User-Role: staff` while authenticated as a customer
gets the customer flag set. There's a test asserting this.

## Consequences

**Positive:**
- Attribute rules are enforceable. A `bulk-actions` flag gated on
  `role in [staff, admin]` cannot be triggered by spoofing.
- The auth model is one familiar Laravel pattern (Sanctum) rather than
  bespoke header parsing.
- Anonymous still works: no token → `$request->user() === null` →
  empty `EvaluationContext`. Reads succeed, mutations 401.

**Negative:**
- The Sanctum cookie is not `httpOnly` so the browser-side `apiFetch` can
  read it. In production this would move behind a same-origin Next.js BFF
  proxy so the cookie becomes `httpOnly` and the bearer header is
  forwarded server-side. The auth model is identical; only the storage
  shape differs.
- Persona-switching requires a round-trip to mint a token. We could keep
  a small client cache keyed by email; we don't, because the latency is
  invisible (~30ms in dev) and a fresh token is the right shape for a
  demo.

## Re-evaluation triggers

- Moving to a real production deployment with end-user logins: the
  `impersonate` controller is replaced by a regular login flow (password,
  OIDC, SSO). The downstream contract — `{token, user}` returned to
  Next.js — is unchanged.
- Adding fine-grained authorisation per-flag (policies). Right now any
  authenticated user can evaluate; in production some flags would be
  filtered before they hit the wire.
