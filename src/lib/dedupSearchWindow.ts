export const DEDUP_SEARCH_PAGE_SIZE = 5;

export function nextDedupSearchVisibleCount(
  visibleCount: number,
  resultCount: number,
): number {
  if (visibleCount >= resultCount) return DEDUP_SEARCH_PAGE_SIZE;
  return Math.min(resultCount, visibleCount + DEDUP_SEARCH_PAGE_SIZE);
}
