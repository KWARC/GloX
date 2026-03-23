import { initFloDown } from "@/lib/flodownClient";
import {
  DefiniendumNode,
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlStatement,
  normalizeToRoot,
} from "@/types/ftml.types";

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
      content: rewriteContent(
        def.content,
        uriMap,
        futureRepo,
        filePath,
        fileName,
      ),
    };
  }

  if (node.type === "definiendum") {
    const defNode = node as DefiniendumNode;

    if (
      defNode.symdecl === false &&
      defNode.uri &&
      !defNode.uri.startsWith("http")
    ) {
      const symbolName = defNode.uri;
      const tempUri = `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${symbolName}`;

      return {
        ...defNode,
        uri: tempUri,
        content: rewriteContent(
          defNode.content ?? [],
          uriMap,
          futureRepo,
          filePath,
          fileName,
        ),
      };
    }

    return {
      ...defNode,
      uri: uriMap.get(defNode.uri!) ?? defNode.uri,
      content: rewriteContent(
        defNode.content ?? [],
        uriMap,
        futureRepo,
        filePath,
        fileName,
      ),
    };
  }

  if (node.type === "symref") {
    const symrefUri = node.uri;

    if (symrefUri && !isMathHubUri(symrefUri)) {
      const symbolName = symrefUri;
      const tempUri = `http://${futureRepo}?a=${filePath}&m=${fileName}&s=${symbolName}`;

      return {
        ...node,
        uri: tempUri,
        content: rewriteContent(
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
      content: rewriteContent(
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
      content: rewriteContent(
        node.content,
        uriMap,
        futureRepo,
        filePath,
        fileName,
      ),
    };
  }

  return node;
}

function rewriteContent(
  content: FtmlContent[],
  uriMap: Map<string, string>,
  futureRepo: string,
  filePath: string,
  fileName: string,
): FtmlContent[] {
  return content.map((item) => {
    if (typeof item === "string") return item;

    return finalFTML(item, uriMap, futureRepo, filePath, fileName);
  });
}

function collectSymbolsToRemove(content: FtmlContent[]): Set<string> {
  const toRemove = new Set<string>();

  for (const item of content) {
    if (typeof item === "string") continue;

    if (item.type === "definiendum") {
      const defNode = item as DefiniendumNode;
      if (
        defNode.symdecl === false &&
        defNode.uri &&
        !defNode.uri.startsWith("http")
      ) {
        toRemove.add(defNode.uri);
      }
    }

    if (item.type === "symref") {
      const symrefUri = item.uri;
      if (symrefUri && !isMathHubUri(symrefUri)) {
        toRemove.add(symrefUri);
      }
    }

    if (item.content) {
      const nested = collectSymbolsToRemove(item.content);
      nested.forEach((s) => toRemove.add(s));
    }
  }

  return toRemove;
}

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
  futureRepo: string,
  filePath: string,
  fileName: string,
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");
  const fd = floDown.FloDown.fromUri(
    `http://=${futureRepo}?a==${filePath}&d=${fileName}&l=en`,
  );

  const root = normalizeToRoot(ftmlAst);

  for (const block of root.content) {
    if (block.type === "paragraph") {
      fd.addElement(block);
      continue;
    }

    if (block.type !== "definition") continue;

    const def = block as DefinitionNode;
    const symbolsToRemove = collectSymbolsToRemove(def.content);

    const filteredForSymbols = def.for_symbols.filter(
      (symbolName) => !symbolsToRemove.has(symbolName),
    );

    const uriMap = new Map<string, string>();

    for (const symbolName of filteredForSymbols) {
      if (!symbolName.startsWith("http")) {
        const declaredUri = fd.addSymbolDeclaration(symbolName);
        uriMap.set(symbolName, declaredUri);
      }
    }

    const transformedDef = {
      ...def,
      for_symbols: filteredForSymbols.map((s) => uriMap.get(s) ?? s),
      content: rewriteContent(
        def.content,
        uriMap,
        futureRepo,
        filePath,
        fileName,
      ),
    };

    fd.addElement(transformedDef);
  }

  return fd.getStex();
}
