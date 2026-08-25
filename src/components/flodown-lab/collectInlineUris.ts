export function collectInlineUris(value: unknown, path = "$"): string[] {
  const found: string[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      found.push(...collectInlineUris(item, `${path}[${index}]`));
    });
    return found;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.uri === "string" && record.uri.length > 0) {
      found.push(`${path}.uri = ${record.uri}`);
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "uri") continue;
      found.push(...collectInlineUris(child, `${path}.${key}`));
    }
  }

  return found;
}
