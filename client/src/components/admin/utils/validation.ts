export function formatValidationError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const inner = (body as { body?: unknown }).body;
  if (inner && typeof inner === "object" && "errors" in inner) {
    const errs = (inner as { errors?: Record<string, string[]> }).errors ?? {};
    const lines = Object.entries(errs).map(([k, vs]) => `${k}: ${vs.join(", ")}`);
    if (lines.length) return lines.join("\n");
  }
  if ("error" in body && typeof (body as { error: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return null;
}
