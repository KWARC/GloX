import { initFloDown } from "@/lib/flodownClient";
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
): void {
  if (typeof node === "string") return;

  if (node.type === "symref" && node.uri && !isHttp(node.uri)) {
    acc.add(node.uri);
  }

  if (
    isDefiniendumNode(node) &&
    node.symdecl === false &&
    node.uri &&
    !isHttp(node.uri)
  ) {
    acc.add(node.uri);
  }

  if (node.content) {
    node.content.forEach((c) => collectExternalSymbols(c, acc));
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
): FtmlNode {
  if (node.type === "definition") {
    const def = node as DefinitionNode;
    return {
      ...def,
      for_symbols: def.for_symbols.map((s) => uriMap.get(s) ?? s),
      content: rewrite(
        node.content ?? [],
        uriMap,
        futureRepo,
        filePath,
        fileName,
      ),
    };
  }

  if (node.type === "definiendum") {
    const n = node as DefiniendumNode;

    if (!n.symdecl && n.uri && !isHttp(n.uri)) {
      return {
        ...n,
        uri: `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${n.uri}`,
        content: rewrite(
          n.content ?? [],
          uriMap,
          futureRepo,
          filePath,
          fileName,
        ),
      };
    }

    return {
      ...n,
      uri: uriMap.get(n.uri!) ?? n.uri,
      content: rewrite(n.content ?? [], uriMap, futureRepo, filePath, fileName),
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
      ),
    };
  }

  if (node.content) {
    return {
      ...node,
      content: rewrite(node.content, uriMap, futureRepo, filePath, fileName),
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
): FtmlContent[] {
  return content.map((c) =>
    typeof c === "string"
      ? c
      : finalFTML(c, uriMap, futureRepo, filePath, fileName),
  );
}

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
  futureRepo: string,
  filePath: string,
  fileName: string,
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

  for (const block of root.content) {
    if (block.type === "paragraph") {
      fdVisible.addElement(block);
      continue;
    }

    if (block.type !== "definition") continue;

    const def = block as DefinitionNode;

    const external = new Set<string>();
    collectExternalSymbols(def, external);

    const deps =
      external.size > 0
        ? await getDefiningDefinitions({
            data: { labels: Array.from(external) },
          })
        : {};

    const uriMap = new Map<string, string>();

    for (const [label, depDef] of Object.entries(deps)) {
      const uri = fdHidden.addSymbolDeclaration(label);
      uriMap.set(label, uri);

      const rewritten = finalFTML(
        depDef,
        uriMap,
        futureRepo,
        filePath,
        fileName,
      );

      fdHidden.addElement(rewritten);
    }

    for (const symbol of def.for_symbols) {
      if (!uriMap.has(symbol) && !symbol.startsWith("http")) {
        const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
        fdVisible.addSymbolDeclaration(symbol);

        uriMap.set(symbol, hiddenUri);
      }
    }

    const rewritten = finalFTML(def, uriMap, futureRepo, filePath, fileName);

    fdVisible.addElement(rewritten);
  }

  return fdVisible.getStex();
}
