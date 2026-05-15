export type StatusFilter = "all" | "open" | "closed";

export const OPEN_STATUSES = new Set(["submitted", "reviewing"]);
export const CLOSED_STATUSES = new Set(["approved", "rejected", "repaired"]);
