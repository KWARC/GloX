import { initFloDown } from "@/lib/flodownClient";
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

function isMathHubUri(uri: string): boolean {
  return (
    uri.startsWith("http://mathhub.info?") ||
    uri.startsWith("https://mathhub.info?")
  );
}

function rewriteInlineUris(
  content: FloDownContent[],
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
): FloDownContent[] {
  return mapInlines(content, (item) => {
    if (typeof item === "string") return item;

    if (isDefiniendumNode(item)) {
      const n = item as DefiniendumNode;
      if (n.uri && !isHttp(n.uri) && !uriMap.has(n.uri)) {
        return {
          ...n,
          uri: `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${n.uri}`,
        };
      }
      return { ...n, uri: uriMap.get(n.uri) ?? n.uri };
    }

    if (item.type === "symref") {
      const u = item.uri;
      if (u && !isMathHubUri(u)) {
        return {
          ...item,
          uri: `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${u}`,
        };
      }
      return { ...item, uri: uriMap.get(item.uri) ?? item.uri };
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
): PersistedBlock | DefinitionNode {
  if (block.type === "paragraph") {
    return mapInlineContent(block, (content) =>
      rewriteInlineUris(content, uriMap, futureRepo, filePath, fileName),
    );
  }

  const rewritten = mapInlineContent(block as DefinitionNode, (content) =>
    rewriteInlineUris(content, uriMap, futureRepo, filePath, fileName),
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
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fdHidden = floDown.FloDown.fromUri(
    `http://hidden?a=temp&d=${fileName}&l=en`,
  );

  const fdVisible = floDown.FloDown.fromUri(
    `http://${futureRepo}?a=${filePath}&d=${fileName}&l=en`,
  );

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
          const hiddenUri = fdHidden.addSymbolDeclaration(label);
          hiddenUriMap.set(label, hiddenUri);
          visibleUriMap.set(label, hiddenUri);
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
        ) as DefinitionNode,
      );
    }

    for (const symbol of declaredOnThisRow) {
      if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
        const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
        const visibleUri = fdVisible.addSymbolDeclaration(symbol);

        hiddenUriMap.set(symbol, hiddenUri);
        visibleUriMap.set(symbol, visibleUri);
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
      ) as DefinitionNode,
    );
  }

  return fdVisible.getStex();
}
