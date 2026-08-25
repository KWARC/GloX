/// <reference path="../../public/flodown/flodown.d.ts" />

/** MathHub host for every document and symbol URI GloX constructs. */
export const FLODOWN_MATHHUB_BASE = "http://mathhub.info";

export type FloDownExportIdentity = {
  /** GloX `futureRepo` — MathHub archive (`a=`). */
  archive: string;
  /** GloX `filePath` / `modulesFilePath` / `defsFilePath` — path inside archive (`p=`). */
  path?: string | null;
  /** GloX `fileName` or `moduleId` — document name (`d=`). */
  name: string;
  language: string;
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

/** FloDown expects `http://mathhub.info?a=…` with raw query values. */
function buildFloDownQueryUri(
  params: Record<string, string | undefined>,
): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length
    ? `${FLODOWN_MATHHUB_BASE}?${parts.join("&")}`
    : FLODOWN_MATHHUB_BASE;
}

/** Document URI: `http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}`. */
export function documentUri(identity: FloDownExportIdentity): string {
  return buildFloDownQueryUri({
    a: identity.archive,
    p: identity.path?.trim() || undefined,
    d: identity.name,
    l: identity.language,
  });
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

/** Document URI from a FloDown block / module row. */
export function documentUriFromGlox(params: {
  futureRepo: string;
  filePath?: string | null;
  fileName: string;
  language: string;
}): string {
  return documentUri(exportIdentityFromGlox(params));
}

/** Preview with no row identity: `a=no/archive`, `d={docId}`. */
export function scratchDocumentUri(docId: string, language = "en"): string {
  return documentUriFromGlox({
    futureRepo: "no/archive",
    filePath: "",
    fileName: docId.slice(0, 200) || "scratch",
    language,
  });
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

/** Create a FloDown document via `fromUri` (D-FTML-02). */
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

export function createFloDownDocumentFromGlox(
  FloDown: FloDownConstructor,
  params: {
    futureRepo: string;
    filePath?: string | null;
    fileName: string;
    language: string;
  },
): FloDownDocumentBlock {
  return createFloDownDocument(FloDown, exportIdentityFromGlox(params));
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
