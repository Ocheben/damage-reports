import "server-only";

import { cookies } from "next/headers";

import {
  ADMIN_IDENTITY_COOKIE_NAME,
  ANONYMOUS_IDENTITY,
  IDENTITY_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
  type Identity,
} from "./identity-shared";

export {
  ADMIN_IDENTITY_COOKIE_NAME,
  ADMIN_TOKEN_COOKIE_NAME,
  ANONYMOUS_IDENTITY,
  IDENTITY_COOKIE_NAME,
  TOKEN_COOKIE_NAME,
} from "./identity-shared";
export type { Identity } from "./identity-shared";

/**
 * Persona metadata stamped at login. Presentational only — the trusted
 * identity comes from /api/auth/me. Token + identity cookies move together.
 */
function parseIdentityCookie(raw: string | undefined): Identity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      userKey: typeof parsed.userKey === "string" ? parsed.userKey : null,
      role: typeof parsed.role === "string" ? parsed.role : "anonymous",
      country: typeof parsed.country === "string" ? parsed.country : "NL",
      name: typeof parsed.name === "string" ? parsed.name : "Anonymous",
    };
  } catch {
    return null;
  }
}

export function readIdentity(): Identity {
  return parseIdentityCookie(cookies().get(IDENTITY_COOKIE_NAME)?.value) ?? ANONYMOUS_IDENTITY;
}

/**
 * The admin's stashed identity during impersonation; null otherwise.
 */
export function readAdminIdentity(): Identity | null {
  return parseIdentityCookie(cookies().get(ADMIN_IDENTITY_COOKIE_NAME)?.value);
}

export function readAuthToken(): string | null {
  return cookies().get(TOKEN_COOKIE_NAME)?.value ?? null;
}
