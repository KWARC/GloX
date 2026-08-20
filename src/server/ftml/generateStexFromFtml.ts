import { initFloDown } from "@/lib/flodownClient";
import {
  createFloDownDocument,
  declareSymbol,
  exportIdentityFromGlox,
  canonicalizeSymbolUri,
  hiddenScratchDocumentUri,
  symbolIdentityFromGlox,
} from "@/lib/flodownUris";
import { buildForSymbols } from "@/server/ftml/declaredSymbols";
import {
  collectExternalSymbols,
  isHttp,
  mapInlineContent,
  mapInlines,
} from "@/server/ftml/statementContent";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefiniendumNode,
  DefinitionNode,
  FloDownContent,
  FloDownStatement,
  isDefiniendumNode,
  normalizeToRoot,
  PersistedBlock,
  toExportDefinition,
} from "@/types/floDown.types";

export { isHttp };

function resolveExportSymbolUri(
  uri: string,
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
): string {
  const fallback = symbolIdentityFromGlox({
    futureRepo,
    filePath,
    fileName,
    symbolName: "symbol",
  });
  const mapped = uriMap.get(uri) ?? uri;
  return canonicalizeSymbolUri(mapped, { ...fallback, symbol: mapped });
}

function rewriteInlineUris(
  content: FloDownContent[],
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
  asParagraph: boolean,
): FloDownContent[] {
  return mapInlines(content, (item) => {
    if (typeof item === "string") return item;

    if (isDefiniendumNode(item)) {
      const { symdecl: _symdecl, ...rest } = item as DefiniendumNode;
      const uri = resolveExportSymbolUri(
        rest.uri,
        uriMap,
        futureRepo,
        filePath,
        fileName,
      );
      // Paragraph Inline does not include definiendum; extra `symdecl` also fails serde.
      if (asParagraph) {
        return { type: "symref", uri, content: rest.content ?? [] };
      }
      return { type: "definiendum", uri, content: rest.content ?? [] };
    }

    if (item.type === "symref") {
      return {
        type: "symref",
        uri: resolveExportSymbolUri(
          item.uri,
          uriMap,
          futureRepo,
          filePath,
          fileName,
        ),
        content: item.content ?? [],
      };
    }

    if (asParagraph && item.type === "definiens") {
      return { type: "symref", uri: item.uri, content: item.content ?? [] };
    }

    return item;
  });
}

export function toExportBlock(
  block: PersistedBlock,
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
  blockStatement: FloDownStatement,
  declaredSymbols: readonly string[],
  _language = "en",
): PersistedBlock | DefinitionNode {
  if (block.type === "paragraph") {
    return mapInlineContent(block, (content) =>
      rewriteInlineUris(
        content,
        uriMap,
        futureRepo,
        filePath,
        fileName,
        true,
      ),
    );
  }

  const rewritten = mapInlineContent(block as DefinitionNode, (content) =>
    rewriteInlineUris(
      content,
      uriMap,
      futureRepo,
      filePath,
      fileName,
      false,
    ),
  ) as DefinitionNode;

  return toExportDefinition(
    rewritten,
    buildForSymbols(blockStatement, uriMap, declaredSymbols),
  );
}

export async function generateStexFromFloDown(
  statement: FloDownStatement,
  futureRepo: string,
  filePath: string,
  fileName: string,
  declaredSymbolsPerBlock: readonly (readonly string[])[] = [],
  language = "en",
): Promise<string> {
  const floDown = await initFloDown();

  const exportIdentity = exportIdentityFromGlox({
    futureRepo,
    filePath,
    fileName,
    language,
  });

  const fdHidden = floDown.FloDown.fromUri(
    hiddenScratchDocumentUri(fileName, language),
  );

  const fdVisible = createFloDownDocument(floDown.FloDown, exportIdentity);

  const root = normalizeToRoot(statement);

  for (let blockIndex = 0; blockIndex < root.content.length; blockIndex += 1) {
    const block = root.content[blockIndex];

    if (block.type === "paragraph") {
      fdVisible.addElement(
        toExportBlock(
          block,
          new Map(),
          futureRepo,
          filePath,
          fileName,
          block,
          [],
          language,
        ) as PersistedBlock,
      );
      continue;
    }

    if (block.type !== "definition") continue;

    const def = block as DefinitionNode;
    const declaredOnThisRow = new Set(
      declaredSymbolsPerBlock[blockIndex] ?? [],
    );

    const external = collectExternalSymbols(def, declaredOnThisRow);

    const deps =
      external.length > 0
        ? await getDefiningDefinitions({
            data: { labels: external },
          })
        : {};

    const hiddenUriMap = new Map<string, string>();
    const visibleUriMap = new Map<string, string>();
    const uniqueDeps = new Map(Object.entries(deps));

    for (const dep of uniqueDeps.values()) {
      for (const label of dep.declaredSymbols) {
        if (!hiddenUriMap.has(label)) {
          const hiddenUri = declareSymbol(fdHidden, label, hiddenUriMap);
          if (hiddenUri) {
            visibleUriMap.set(label, hiddenUri);
          }
        }
      }

      fdHidden.addElement(
        toExportBlock(
          dep.definition,
          hiddenUriMap,
          futureRepo,
          filePath,
          fileName,
          dep.definition,
          dep.declaredSymbols,
          language,
        ) as DefinitionNode,
      );
    }

    for (const symbol of declaredOnThisRow) {
      if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
        declareSymbol(fdHidden, symbol, hiddenUriMap);
        declareSymbol(fdVisible, symbol, visibleUriMap);
      }
    }

    const declaredOnThisRowList = declaredSymbolsPerBlock[blockIndex] ?? [];
    fdVisible.addElement(
      toExportBlock(
        def,
        visibleUriMap,
        futureRepo,
        filePath,
        fileName,
        def,
        declaredOnThisRowList,
        language,
      ) as DefinitionNode,
    );
  }

  return fdVisible.getStex();
}
