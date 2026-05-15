/**
 * Module-singleton pub/sub bridging apiFetch and FeatureFlagProvider without
 * touching window. Reset via __resetForTests in tests.
 */

export type FlagEvent =
  | { type: "feature_disabled"; flag: string }
  | { type: "force_refresh" };

type Listener = (event: FlagEvent) => void;

const listeners = new Set<Listener>();

export function subscribeToFlagEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitFlagEvent(event: FlagEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      // A misbehaving listener should not break the rest.
      // eslint-disable-next-line no-console
      console.error("flag event listener threw", err);
    }
  }
}

/** Test helper. */
export function __resetForTests(): void {
  listeners.clear();
}
