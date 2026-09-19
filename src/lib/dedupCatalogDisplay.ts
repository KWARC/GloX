export const CONFIRMED_NOT_DUPLICATE_SECTION_TITLE =
  "Confirmed not a duplicate";

export const DEDUP_PAGE_SIZE = 20;

export function partitionDedupCatalog<T extends { hasConfirmed: boolean }>(
  symbols: readonly T[],
): {
  unconfirmed: T[];
  confirmed: T[];
} {
  const unconfirmed: T[] = [];
  const confirmed: T[] = [];
  for (const symbol of symbols) {
    if (symbol.hasConfirmed) confirmed.push(symbol);
    else unconfirmed.push(symbol);
  }
  return { unconfirmed, confirmed };
}

export function paginateDedupCatalog<T>(
  unconfirmed: readonly T[],
  confirmed: readonly T[],
  page: number,
  pageSize: number = DEDUP_PAGE_SIZE,
): {
  unconfirmed: T[];
  confirmed: T[];
  totalEntries: number;
  totalPages: number;
} {
  const totalEntries = unconfirmed.length + confirmed.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = [...unconfirmed, ...confirmed].slice(start, end);
  const unconfirmedCount = Math.max(
    0,
    Math.min(pageItems.length, unconfirmed.length - start),
  );

  return {
    unconfirmed: pageItems.slice(0, unconfirmedCount),
    confirmed: pageItems.slice(unconfirmedCount),
    totalEntries,
    totalPages,
  };
}
