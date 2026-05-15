/** Format a YYYY-MM-DDTHH:MM(...) ISO string as "YYYY-MM-DD HH:MM" — null if unparseable. */
export function formatIncident(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

/** Short variant for compact cards: "MM-DD HH:MM". */
export function formatIncidentShort(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return `${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}
