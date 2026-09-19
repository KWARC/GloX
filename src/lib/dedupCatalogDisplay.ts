export const CONFIRMED_NOT_DUPLICATE_SECTION_TITLE =
  "Confirmed not a duplicate";

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
