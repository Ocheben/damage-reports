// Shared identity types; cookie reader lives in identity.ts (server-only).

export type Identity = {
  // Mirrors App\Models\User::flagUserKey() on the server (email).
  userKey: string | null;
  role: string;
  country: string;
  name: string;
};

export const TOKEN_COOKIE_NAME = "ff_auth_token";
export const IDENTITY_COOKIE_NAME = "ff_identity";

// Stashed during impersonation so "stop impersonating" restores without re-login.
export const ADMIN_TOKEN_COOKIE_NAME = "ff_admin_token";
export const ADMIN_IDENTITY_COOKIE_NAME = "ff_admin_identity";

export const ANONYMOUS_IDENTITY: Identity = {
  userKey: null,
  role: "anonymous",
  country: "NL",
  name: "Anonymous",
};
