import { initFloDown } from "@/lib/flodownClient";
import { buildForSymbols } from "@/server/ftml/declaredSymbols";
import {
  collectExternalSymbols,
  isHttp,
} from "@/server/ftml/generateStexFromFtml";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefiniendumNode,
  DefinitionNode,
  FloDownContent,
  FloDownNode,
  FloDownStatement,
  isDefiniendumNode,
  isDefinitionNode,
  normalizeToRoot,
  ParagraphNode,
  SymrefNode,
} from "@/types/floDown.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FloDownStatement;
  docId: string;
  declaredSymbols?: string[];
}

type FloDownBlock = {
  mountTo: (el: HTMLElement) => void;
  addElement: (node: FloDownNode) => void;
  addSymbolDeclaration: (name: string) => string;
  getStex(): string;
  getFtml(): string;
  clear: () => void;
  clearText: () => void;
};

type FloDownLib = {
  setBackendUrl: (url: string) => void;
  FloDown: { fromUri: (uri: string) => FloDownBlock };
};

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function rewriteContentArray(
  content: FloDownContent[],
  uriMap: Map<string, string>,
  docId: string,
): FloDownContent[] {
  return content.map((c) =>
    typeof c === "string" ? c : rewriteNode(c, uriMap, docId),
  );
}

function rewriteNode(
  node: FloDownNode,
  uriMap: Map<string, string>,
  docId: string,
  blockStatement?: FloDownStatement,
): FloDownNode {
  if (isDefinitionNode(node)) {
    const def = node as DefinitionNode;
    const statement = blockStatement ?? def;
    return {
      ...def,
      for_symbols: buildForSymbols(statement, uriMap),
      content: rewriteContentArray(def.content, uriMap, docId),
    };
  }

  if (isDefiniendumNode(node)) {
    const n = node as DefiniendumNode;

    if (isHttp(n.uri)) {
      return {
        ...n,
        content: rewriteContentArray(n.content ?? [], uriMap, docId),
      };
    }

    const resolved = uriMap.get(n.uri);

    if (resolved) {
      return {
        ...n,
        uri: resolved,
        content: rewriteContentArray(n.content ?? [], uriMap, docId),
      };
    }

    return {
      ...n,
      uri: `http://temp-visible?a=temp&d=${docId}&l=en&s=${n.uri}`,
      content: rewriteContentArray(n.content ?? [], uriMap, docId),
    };
  }

  if (node.type === "symref") {
    const n = node as SymrefNode;

    if (isHttp(n.uri)) return n;
    const resolved = uriMap.get(n.uri);

    if (resolved) {
      return {
        ...n,
        uri: resolved,
        content: rewriteContentArray(n.content ?? [], uriMap, docId),
      };
    }

    return {
      ...n,
      uri: `http://temp-visible?a=temp&d=${docId}&l=en&s=${n.uri}`,
      content: rewriteContentArray(n.content ?? [], uriMap, docId),
    };
  }

  if (node.content) {
    return {
      ...node,
      content: rewriteContentArray(node.content, uriMap, docId),
    };
  }

  return node;
}

export function FtmlPreview({
  ftmlAst,
  docId,
  declaredSymbols = [],
}: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const fdHiddenRef = useRef<FloDownBlock | null>(null);
  const fdVisibleRef = useRef<FloDownBlock | null>(null);

  useEffect(() => {
    const containerEl = containerRef.current;
    const hiddenEl = hiddenRef.current;

    if (!containerEl || !hiddenEl) return;

    let disposed = false;

    (async () => {
      const floDown = (await initFloDown()) as FloDownLib;
      if (disposed) return;

      floDown.setBackendUrl("https://mathhub.info");

      const fdHidden = floDown.FloDown.fromUri(
        `http://temp-hidden?a=temp&d=${docId}&l=en`,
      );
      hiddenEl.innerHTML = "";
      fdHidden.mountTo(hiddenEl);
      hiddenEl.style.display = "none";

      const fdVisible = floDown.FloDown.fromUri(
        `http://temp-visible?a=temp&d=${docId}&l=en`,
      );
      fdHiddenRef.current = fdHidden;
      fdVisibleRef.current = fdVisible;
      containerEl.innerHTML = "";
      fdVisible.mountTo(containerEl);

      const root = normalizeToRoot(ftmlAst);
      const declaredOnThisRow = new Set(declaredSymbols);

      for (const block of root.content) {
        if (disposed) return;

        if (block.type === "paragraph") {
          fdVisible.addElement(deepClone(block as ParagraphNode));
          continue;
        }

        if (!isDefinitionNode(block)) continue;

        const def = block as DefinitionNode;

        const external = new Set<string>();
        collectExternalSymbols(def, external, declaredOnThisRow);

        const deps =
          external.size > 0
            ? await getDefiningDefinitions({
                data: { labels: Array.from(external) },
              })
            : {};

        if (disposed) return;

        const hiddenUriMap = new Map<string, string>();
        const visibleUriMap = new Map<string, string>();

        for (const dep of Object.values(deps)) {
          for (const label of dep.declaredSymbols) {
            if (!hiddenUriMap.has(label)) {
              const hiddenUri = fdHidden.addSymbolDeclaration(label);
              hiddenUriMap.set(label, hiddenUri);
              visibleUriMap.set(label, hiddenUri);
            }
          }

          const rewrittenDep = rewriteNode(
            deepClone(dep.definition),
            hiddenUriMap,
            docId,
            dep.definition,
          );
          fdHidden.addElement(rewrittenDep);
        }

        for (const symbol of declaredOnThisRow) {
          if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
            const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
            const visibleUri = fdVisible.addSymbolDeclaration(symbol);

            hiddenUriMap.set(symbol, hiddenUri);
            visibleUriMap.set(symbol, visibleUri);
          }
        }

        const rewritten = rewriteNode(deepClone(def), visibleUriMap, docId, def);
        fdVisible.addElement(rewritten);
      }
    })();

    return () => {
      disposed = true;

      if (fdHiddenRef.current) {
        try {
          fdHiddenRef.current.clear();
        } catch {}
        fdHiddenRef.current = null;
      }

      if (fdVisibleRef.current) {
        try {
          fdVisibleRef.current.clear();
        } catch {}
        fdVisibleRef.current = null;
      }

      if (containerEl) containerEl.innerHTML = "";
      if (hiddenEl) hiddenEl.innerHTML = "";
    };
  }, [ftmlAst, docId, declaredSymbols]);

  return (
    <>
      <div ref={hiddenRef} />
      <div ref={containerRef} />
    </>
  );
}
