/// <reference path="../../public/flodown/flodown.d.ts" />

/** MathHub base for export-bound document and symbol URIs (see public/flodown/test.html). */
export const FLODOWN_MATHHUB_BASE = "http://mathhub.info";

/** FloDown fallback document identity when no export context is available. */
export const FLODOWN_UNKNOWN_DOCUMENT =
  "http://unknown.source?a=no/archive&d=unknown_document&l=en";

export type FloDownExportIdentity = {
  /** GloX `futureRepo` — MathHub archive (`a=`). */
  archive: string;
  /** GloX `filePath` / `modulesFilePath` / `defsFilePath` — path inside archive (`p=`). */
  path?: string | null;
  /** GloX `fileName` or `moduleId` — document name (`d=`). */
  name: string;
  language: string;
};

export type FloDownSymbolIdentity = {
  archive: string;
  path?: string | null;
  /** Module name for symbol URIs (`m=`). */
  module: string;
  symbol: string;
};

/** FloDown `Language` enum values from `flodown.d.ts` (must not use `wasm_bindgen` at runtime). */
export const FloDownLanguage = {
  English: 0,
  German: 1,
  French: 2,
  Romanian: 3,
  Arabic: 4,
  Bulgarian: 5,
  Russian: 6,
  Finnish: 7,
  Turkish: 8,
  Slovenian: 9,
} as const;

export type FloDownLanguageValue =
  (typeof FloDownLanguage)[keyof typeof FloDownLanguage];

export function languageToFloDown(lang: string): FloDownLanguageValue {
  switch (lang.trim().toLowerCase()) {
    case "de":
      return FloDownLanguage.German;
    case "fr":
      return FloDownLanguage.French;
    case "ro":
      return FloDownLanguage.Romanian;
    case "ar":
      return FloDownLanguage.Arabic;
    case "bg":
      return FloDownLanguage.Bulgarian;
    case "ru":
      return FloDownLanguage.Russian;
    case "fi":
      return FloDownLanguage.Finnish;
    case "tr":
      return FloDownLanguage.Turkish;
    case "sl":
      return FloDownLanguage.Slovenian;
    default:
      return FloDownLanguage.English;
  }
}

/** FloDown expects `http://host?a=…` with raw query values (see test.html). */
export function buildFloDownQueryUri(
  base: string,
  params: Record<string, string | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length ? `${base}?${parts.join("&")}` : base;
}

/** Build a FloDown DocumentUri: `http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}`. */
export function documentUri(identity: FloDownExportIdentity): string {
  return buildFloDownQueryUri(FLODOWN_MATHHUB_BASE, {
    a: identity.archive,
    p: identity.path?.trim() || undefined,
    d: identity.name,
    l: identity.language,
  });
}

/** Fallback symbol URI when `addSymbolDeclaration` cannot be used yet. */
export function symbolUri(identity: FloDownSymbolIdentity): string {
  return buildFloDownQueryUri(FLODOWN_MATHHUB_BASE, {
    a: identity.archive,
    p: identity.path?.trim() || undefined,
    m: identity.module,
    s: identity.symbol,
  });
}

/**
 * FloDown `SymbolUri` is `http://mathhub.info?a=…&p=…&m=…&s=…` (no `l=`).
 * Rewrite short names, inverted GloX hosts, and stray language params.
 */
export function canonicalizeSymbolUri(
  uri: string,
  fallback: FloDownSymbolIdentity,
): string {
  if (!uri) {
    return symbolUri({ ...fallback, symbol: "unknown" });
  }

  if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
    return symbolUri({ ...fallback, symbol: uri });
  }

  try {
    const url = new URL(uri);
    const symbol = url.searchParams.get("s");
    if (!symbol) {
      return symbolUri({ ...fallback, symbol: uri });
    }

    const module =
      url.searchParams.get("m") ||
      url.searchParams.get("d") ||
      fallback.module;

    if (url.hostname.endsWith("mathhub.info")) {
      return symbolUri({
        archive: url.searchParams.get("a") || fallback.archive,
        path: url.searchParams.get("p"),
        module,
        symbol,
      });
    }

    const archiveFromHost = `${url.hostname}${url.pathname}`.replace(
      /\/$/,
      "",
    );
    return symbolUri({
      archive: archiveFromHost || fallback.archive,
      path: url.searchParams.get("p") || url.searchParams.get("a"),
      module,
      symbol,
    });
  } catch {
    return symbolUri({ ...fallback, symbol: uri });
  }
}

export function exportIdentityFromGlox(params: {
  futureRepo: string;
  filePath?: string | null;
  fileName: string;
  language: string;
}): FloDownExportIdentity {
  return {
    archive: params.futureRepo,
    path: params.filePath,
    name: params.fileName,
    language: params.language,
  };
}

export function symbolIdentityFromGlox(params: {
  futureRepo: string;
  filePath?: string | null;
  fileName: string;
  symbolName: string;
}): FloDownSymbolIdentity {
  return {
    archive: params.futureRepo,
    path: params.filePath,
    module: params.fileName,
    symbol: params.symbolName,
  };
}

/** Scratch preview/export document when no real export identity is mounted. */
export function scratchDocumentUri(docId: string, language = "en"): string {
  return buildFloDownQueryUri("http://unknown.source", {
    a: "no/archive",
    d: docId.slice(0, 200) || "scratch",
    l: language,
  });
}

export function hiddenScratchDocumentUri(name: string, language = "en"): string {
  return scratchDocumentUri(`hidden-${name}`, language);
}

export type FloDownDocumentBlock = {
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
  addSymbolDeclaration?: (name: string) => string | undefined;
  getStex(): string;
  getFtml?(): string;
  mountTo?(node: HTMLElement): void;
  clear?: () => void;
  clearText?(): void;
};

type FloDownConstructor = {
  fromUri(uri: string): FloDownDocumentBlock;
};

/** Create a FloDown document block via `fromUri` (see public/flodown/test.html). */
export function createFloDownDocument(
  FloDown: FloDownConstructor,
  identity: FloDownExportIdentity,
): FloDownDocumentBlock {
  const uri = documentUri(identity);
  try {
    return FloDown.fromUri(uri);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(`FloDown rejected document URI ${uri}: ${message}`, {
      cause: error,
    });
  }
}

/** Register a symbol declaration; returns undefined when FloDown rejects the name. */
export function declareSymbol(
  block: {
    addSymbolDeclaration?: (name: string) => string | undefined;
  },
  name: string,
  uriMap: Map<string, string>,
): string | undefined {
  if (!block.addSymbolDeclaration) return undefined;
  const uri = block.addSymbolDeclaration(name);
  if (uri) {
    uriMap.set(name, uri);
  }
  return uri;
}
