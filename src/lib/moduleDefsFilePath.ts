export const MODULE_DEFS_PATH_BASE = "defs";

/** Lowercase with spaces as hyphens — same rule as PDF extract content names. */
function slugifySubjectArea(value: string): string {
  return value.trim().toLowerCase().replaceAll(" ", "-");
}

export function defaultDefsFilePath(
  subjectArea: string | null | undefined,
): string {
  const trimmed = subjectArea?.trim();
  if (!trimmed) return MODULE_DEFS_PATH_BASE;
  return `${MODULE_DEFS_PATH_BASE}/${slugifySubjectArea(trimmed)}`;
}

export function resolveDefsFilePath(
  clientValue: string | undefined,
  subjectArea: string | null | undefined,
): string {
  const trimmed = clientValue?.trim();
  if (trimmed) return trimmed;
  return defaultDefsFilePath(subjectArea);
}
