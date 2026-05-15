type EnvShape = {
  // Browser-visible URL, inlined into the client bundle.
  apiBase: string;
  // Server-side URL for Docker compose network; falls back to apiBase.
  apiBaseInternal: string;
};

let cached: EnvShape | null = null;

export function env(): EnvShape {
  if (cached) return cached;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  const apiBaseInternal = process.env.API_BASE_INTERNAL ?? apiBase;

  cached = { apiBase, apiBaseInternal };
  return cached;
}
