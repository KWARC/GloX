import type {
  DeclaredSymbolDraft,
  DeclaredSymbolInfo,
} from "@/types/declaredSymbolsInfo";

export function parseDeclaredSymbolsInfo(value: unknown): DeclaredSymbolInfo[] {
  if (!Array.isArray(value)) return [];

  const result: DeclaredSymbolInfo[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const symbolName =
      typeof record.symbolName === "string" ? record.symbolName.trim() : "";
    const symbolUri =
      typeof record.symbolUri === "string" ? record.symbolUri.trim() : "";
    if (!symbolName || !symbolUri) continue;

    const alias =
      typeof record.alias === "string" && record.alias.trim()
        ? record.alias.trim()
        : undefined;

    result.push({
      symbolName,
      symbolUri,
      hasConfirmed: record.hasConfirmed === true,
      confirmedById:
        typeof record.confirmedById === "string" ? record.confirmedById : null,
      confirmedBy:
        typeof record.confirmedBy === "string" ? record.confirmedBy : null,
      ...(alias ? { alias } : {}),
    });
  }
  return result;
}

export function declaredSymbolUris(
  info: readonly DeclaredSymbolInfo[],
): string[] {
  return info.map((item) => item.symbolUri);
}

export function declaredUrisFromJson(value: unknown): string[] {
  return declaredSymbolUris(parseDeclaredSymbolsInfo(value));
}

export function isDeclaredLocalUri(
  declaredUris: readonly string[] | undefined,
  uri: string,
): boolean {
  const target = uri.trim();
  if (!target) return false;
  return (declaredUris ?? []).includes(target);
}

export function catalogDeclaresUri(
  rows: readonly { declaredSymbolsInfo: unknown; status?: string }[],
  symbolUri: string,
): boolean {
  const target = symbolUri.trim();
  if (!target) return false;
  for (const row of rows) {
    if (row.status === "DISCARDED") continue;
    if (
      parseDeclaredSymbolsInfo(row.declaredSymbolsInfo).some(
        (item) => item.symbolUri === target,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function localDeclarationUris(
  declaredSymbolsInfo: unknown,
  fallbackUris?: readonly string[],
): string[] {
  const fromInfo = declaredUrisFromJson(declaredSymbolsInfo);
  if (fromInfo.length > 0) return fromInfo;
  return [...(fallbackUris ?? [])];
}

export function draftsFromHttpUris(
  uris: readonly string[],
): DeclaredSymbolDraft[] {
  return uris
    .map((uri) => uri.trim())
    .filter((uri) => uri.startsWith("http://") || uri.startsWith("https://"))
    .map((symbolUri) => ({ symbolName: symbolUri, symbolUri }));
}

export function findDeclarationByUri(
  info: readonly DeclaredSymbolInfo[],
  symbolUri: string,
): DeclaredSymbolInfo | undefined {
  return info.find((item) => item.symbolUri === symbolUri);
}

export function findDeclarationByName(
  info: readonly DeclaredSymbolInfo[],
  symbolName: string,
): DeclaredSymbolInfo | undefined {
  const name = symbolName.trim();
  return info.find(
    (item) =>
      item.symbolName === name ||
      (item.alias != null && item.alias === name),
  );
}

export function matchesCatalogQuery(
  item: DeclaredSymbolInfo,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (item.symbolName.toLowerCase().includes(q)) return true;
  return item.alias != null && item.alias.toLowerCase().includes(q);
}

export function createDeclarationRecord(
  draft: DeclaredSymbolDraft,
): DeclaredSymbolInfo {
  const symbolName = draft.symbolName.trim();
  const symbolUri = draft.symbolUri.trim();
  if (!symbolName) {
    throw new Error("Symbol name required");
  }
  if (!symbolUri) {
    throw new Error("Symbol URI required");
  }

  const alias = draft.alias?.trim() || undefined;
  return {
    symbolName,
    symbolUri,
    hasConfirmed: false,
    confirmedById: null,
    confirmedBy: null,
    ...(alias ? { alias } : {}),
  };
}

export function otherBlockDeclaresUri(
  rows: readonly { id: string; declaredSymbolsInfo: unknown; status?: string }[],
  floDownBlockId: string,
  symbolUri: string,
): boolean {
  for (const row of rows) {
    if (row.id === floDownBlockId) continue;
    if (row.status === "DISCARDED") continue;
    const info = parseDeclaredSymbolsInfo(row.declaredSymbolsInfo);
    if (info.some((item) => item.symbolUri === symbolUri)) return true;
  }
  return false;
}

export function upsertDeclaration(
  info: readonly DeclaredSymbolInfo[],
  draft: DeclaredSymbolDraft,
): DeclaredSymbolInfo[] {
  const next = createDeclarationRecord(draft);
  const without = info.filter((item) => item.symbolUri !== next.symbolUri);
  return [...without, next];
}

export function removeDeclarationByUri(
  info: readonly DeclaredSymbolInfo[],
  symbolUri: string,
): DeclaredSymbolInfo[] {
  return info.filter((item) => item.symbolUri !== symbolUri);
}

export function setDeclarationConfirmation(
  info: readonly DeclaredSymbolInfo[],
  symbolUri: string,
  confirmation: {
    hasConfirmed: boolean;
    confirmedById: string | null;
    confirmedBy: string | null;
  },
): DeclaredSymbolInfo[] {
  let found = false;
  const next = info.map((item) => {
    if (item.symbolUri !== symbolUri) return item;
    found = true;
    return {
      ...item,
      hasConfirmed: confirmation.hasConfirmed,
      confirmedById: confirmation.confirmedById,
      confirmedBy: confirmation.confirmedBy,
    };
  });
  if (!found) {
    throw new Error("Symbol not found");
  }
  return next;
}

export function replaceDeclarationUri(
  info: readonly DeclaredSymbolInfo[],
  oldUri: string,
  newUri: string,
): DeclaredSymbolInfo[] {
  return info.map((item) =>
    item.symbolUri === oldUri ? { ...item, symbolUri: newUri } : item,
  );
}
