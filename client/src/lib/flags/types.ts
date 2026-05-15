// Wire format for the Laravel /api/v1/flags/evaluate endpoint.
// Mirrors EvaluationResult on the server.

export type FlagDecision = {
  value: boolean;
  reason: string;
};

export type FlagSet = Record<string, FlagDecision>;

export type EvaluationResponse = {
  flags: FlagSet;
  evaluated_at: string;
  signature: string;
};

// Centralised flag keys so a typo becomes a compile error.
export const FLAG_KEYS = {
  reportPhotos: "report-photos",
  costEstimate: "cost-estimate",
  aiDamageAnalysis: "ai-damage-analysis",
  bulkActions: "bulk-actions",
  exportPdf: "export-pdf",
  maintenanceBanner: "maintenance-banner",
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];
