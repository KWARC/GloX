/** Throwaway helpers for migrate-module-defs-path.mjs — delete with the script after migrate. */

export const MODULE_DEFS_PATH_BASE = "defs";

export function slugifySubjectArea(value) {
  return value.trim().toLowerCase().replaceAll(" ", "-");
}

export function defaultDefsFilePath(subjectArea) {
  const trimmed = subjectArea?.trim();
  if (!trimmed) return MODULE_DEFS_PATH_BASE;
  return `${MODULE_DEFS_PATH_BASE}/${slugifySubjectArea(trimmed)}`;
}

/** Read one query param without normalizing the full URI. */
export function getQueryParam(uri, key) {
  const q = uri.indexOf("?");
  if (q < 0) return null;
  for (const part of uri.slice(q + 1).split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) !== key) continue;
    const raw = part.slice(eq + 1);
    try {
      return decodeURIComponent(raw.replace(/\+/g, " "));
    } catch {
      return raw;
    }
  }
  return null;
}

/**
 * When p= is exactly `defs`, set p to newDefsFilePath (e.g. defs/data-science).
 * Does not use URL.toString() so encoding stays stable for exact DB replace.
 */
export function rewriteUriDefsPath(uri, newDefsFilePath) {
  const q = uri.indexOf("?");
  if (q < 0) return null;
  const prefix = uri.slice(0, q + 1);
  const parts = uri.slice(q + 1).split("&");
  let found = false;
  const next = parts.map((part) => {
    if (!part.startsWith("p=")) return part;
    const rawVal = part.slice(2);
    let decoded;
    try {
      decoded = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch {
      decoded = rawVal;
    }
    if (decoded !== MODULE_DEFS_PATH_BASE) return part;
    found = true;
    return `p=${newDefsFilePath}`;
  });
  if (!found) return null;
  return prefix + next.join("&");
}

/** Exact string replace in JSON trees (matches applyOpaqueUriReplacements). */
export function replaceOpaqueUrisInValue(value, replacements) {
  if (typeof value === "string") {
    return replacements.has(value) ? replacements.get(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceOpaqueUrisInValue(item, replacements));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = replaceOpaqueUrisInValue(child, replacements);
    }
    return next;
  }
  return value;
}

export function parseDeclaredSymbolsInfo(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const symbolName =
      typeof item.symbolName === "string" ? item.symbolName.trim() : "";
    const symbolUri =
      typeof item.symbolUri === "string" ? item.symbolUri.trim() : "";
    if (!symbolName || !symbolUri) continue;
    result.push({ ...item, symbolName, symbolUri });
  }
  return result;
}

export function replaceDeclarationUrisInInfo(info, replacements) {
  return info.map((item) => {
    const newUri = replacements.get(item.symbolUri);
    return newUri ? { ...item, symbolUri: newUri } : item;
  });
}
