export type IndexStatus = "EXTRACTED" | "FINALIZED" | "SUBMITTED_TO_MATHHUB";

export const INDEX_STATUS_CONFIG: Record<
  IndexStatus,
  { color: string; label: string }
> = {
  EXTRACTED: { color: "gray", label: "Extracted" },
  FINALIZED: { color: "blue", label: "Finalized" },
  SUBMITTED_TO_MATHHUB: { color: "teal", label: "Submitted to MathHub" },
};

export const INDEX_STATUS_OPTIONS = (
  Object.entries(INDEX_STATUS_CONFIG) as [IndexStatus, { label: string }][]
).map(([value, { label }]) => ({ value, label }));
