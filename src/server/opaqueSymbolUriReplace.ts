/** Replace exact symbol URI strings in JSON. Does not parse URI structure. */

export function replaceOpaqueUrisInValue(
  value: unknown,
  replacements: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") {
    return replacements.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceOpaqueUrisInValue(item, replacements));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      next[key] = replaceOpaqueUrisInValue(child, replacements);
    }
    return next;
  }
  return value;
}

export function replacementMapFromPairs(
  pairs: ReadonlyArray<{ oldUri: string; newUri: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of pairs) {
    const from = pair.oldUri.trim();
    const to = pair.newUri.trim();
    if (!from || !to || from === to) continue;
    map.set(from, to);
  }
  return map;
}
