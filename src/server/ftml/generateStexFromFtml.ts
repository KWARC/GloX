import { initFloDown } from "@/lib/flodownClient";
import { buildForSymbols } from "@/server/ftml/declaredSymbols";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefiniendumNode,
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlStatement,
  isDefiniendumNode,
  normalizeToRoot,
} from "@/types/ftml.types";

export function isHttp(uri: string) {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

export function collectExternalSymbols(
  node: FtmlNode | FtmlContent,
  acc: Set<string>,
  declaredOnThisRow: ReadonlySet<string> = new Set(),
): void {
  if (typeof node === "string") return;

  if (node.type === "symref" && node.uri && !isHttp(node.uri)) {
    acc.add(node.uri);
  }

  if (
    isDefiniendumNode(node) &&
    node.uri &&
    !isHttp(node.uri) &&
    !declaredOnThisRow.has(node.uri)
  ) {
    acc.add(node.uri);
  }

  if (node.content) {
    node.content.forEach((c) =>
      collectExternalSymbols(c, acc, declaredOnThisRow),
    );
  }
}

function isMathHubUri(uri: string): boolean {
  return (
    uri.startsWith("http://mathhub.info?") ||
    uri.startsWith("https://mathhub.info?")
  );
}

function finalFTML(
  node: FtmlNode,
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
  blockStatement: FtmlStatement,
): FtmlNode {
  if (node.type === "definition") {
    const def = node as DefinitionNode;
    return {
      ...def,
      for_symbols: buildForSymbols(blockStatement, uriMap),
      content: rewrite(
        node.content ?? [],
        uriMap,
        futureRepo,
        filePath,
        fileName,
        blockStatement,
      ),
    };
  }

  if (node.type === "definiendum") {
    const n = node as DefiniendumNode;

    if (n.uri && !isHttp(n.uri) && !uriMap.has(n.uri)) {
      return {
        ...n,
        uri: `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${n.uri}`,
        content: rewrite(
          n.content ?? [],
          uriMap,
          futureRepo,
          filePath,
          fileName,
          blockStatement,
        ),
      };
    }

    return {
      ...n,
      uri: uriMap.get(n.uri!) ?? n.uri,
      content: rewrite(
        n.content ?? [],
        uriMap,
        futureRepo,
        filePath,
        fileName,
        blockStatement,
      ),
    };
  }

  if (node.type === "symref") {
    const u = node.uri;

    if (u && !isMathHubUri(u)) {
      return {
        ...node,
        uri: `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${u}`,
        content: rewrite(
          node.content ?? [],
          uriMap,
          futureRepo,
          filePath,
          fileName,
          blockStatement,
        ),
      };
    }

    return {
      ...node,
      uri: uriMap.get(node.uri!) ?? node.uri,
      content: rewrite(
        node.content ?? [],
        uriMap,
        futureRepo,
        filePath,
        fileName,
        blockStatement,
      ),
    };
  }

  if (node.content) {
    return {
      ...node,
      content: rewrite(
        node.content,
        uriMap,
        futureRepo,
        filePath,
        fileName,
        blockStatement,
      ),
    };
  }

  return node;
}

function rewrite(
  content: FtmlContent[],
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
  blockStatement: FtmlStatement,
): FtmlContent[] {
  return content.map((c) =>
    typeof c === "string"
      ? c
      : finalFTML(c, uriMap, futureRepo, filePath, fileName, blockStatement),
  );
}

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
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

  const root = normalizeToRoot(ftmlAst);

  for (let blockIndex = 0; blockIndex < root.content.length; blockIndex += 1) {
    const block = root.content[blockIndex];

    if (block.type === "paragraph") {
      fdVisible.addElement(block);
      continue;
    }

    if (block.type !== "definition") continue;

    const def = block as DefinitionNode;
    const blockStatement = def;
    const declaredOnThisRow = new Set(
      declaredSymbolsPerBlock[blockIndex] ?? [],
    );

    const external = new Set<string>();
    collectExternalSymbols(def, external, declaredOnThisRow);

    const deps =
      external.size > 0
        ? await getDefiningDefinitions({
            data: { labels: Array.from(external) },
          })
        : {};

    const hiddenUriMap = new Map<string, string>();
    const visibleUriMap = new Map<string, string>();
    const uniqueDeps = new Map<string, (typeof deps)[string]>();
    for (const [label, dep] of Object.entries(deps)) {
      uniqueDeps.set(label, dep);
    }

    for (const dep of uniqueDeps.values()) {
      for (const label of dep.declaredSymbols) {
        if (!hiddenUriMap.has(label)) {
          const hiddenUri = fdHidden.addSymbolDeclaration(label);
          hiddenUriMap.set(label, hiddenUri);
          visibleUriMap.set(label, hiddenUri);
        }
      }

      const rewritten = finalFTML(
        dep.definition,
        hiddenUriMap,
        futureRepo,
        filePath,
        fileName,
        dep.definition,
      );

      fdHidden.addElement(rewritten);
    }

    for (const symbol of declaredOnThisRow) {
      if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
        const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
        const visibleUri = fdVisible.addSymbolDeclaration(symbol);

        hiddenUriMap.set(symbol, hiddenUri);
        visibleUriMap.set(symbol, visibleUri);
      }
    }

    const rewritten = finalFTML(
      def,
      visibleUriMap,
      futureRepo,
      filePath,
      fileName,
      blockStatement,
    );

    fdVisible.addElement(rewritten);
  }

  return fdVisible.getStex();
}
