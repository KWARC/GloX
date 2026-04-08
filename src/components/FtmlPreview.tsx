import { initFloDown } from "@/lib/flodownClient";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefiniendumNode,
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlStatement,
  isDefiniendumNode,
  isDefinitionNode,
  normalizeToRoot,
  ParagraphNode,
  SymrefNode,
} from "@/types/ftml.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FtmlStatement;
  docId: string;
}

type FloDownBlock = {
  mountTo: (el: HTMLElement) => void;
  addElement: (node: FtmlNode) => void;
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

function isHttp(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function collectExternalLabels(
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
    node.content.forEach((c) => collectExternalLabels(c, acc));
  }
}

function rewriteContentArray(
  content: FtmlContent[],
  uriMap: Map<string, string>,
  docId: string,
): FtmlContent[] {
  return content.map((c) =>
    typeof c === "string" ? c : rewriteNode(c, uriMap, docId),
  );
}

function rewriteNode(
  node: FtmlNode,
  uriMap: Map<string, string>,
  docId: string,
): FtmlNode {
  if (isDefinitionNode(node)) {
    const def = node as DefinitionNode;
    return {
      ...def,
      for_symbols: def.for_symbols.map((s) => uriMap.get(s) ?? s),
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

    if (!n.symdecl) {
      return {
        ...n,
        uri: `http://temp-visible?a=temp&d=${docId}&l=en&s=${n.uri}`,
        content: rewriteContentArray(n.content ?? [], uriMap, docId),
      };
    }

    return n;
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

export function FtmlPreview({ ftmlAst, docId }: FtmlPreviewProps) {
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

      for (const block of root.content) {
        if (disposed) return;

        if (block.type === "paragraph") {
          fdVisible.addElement(deepClone(block as ParagraphNode));
          continue;
        }

        if (!isDefinitionNode(block)) continue;

        const def = block as DefinitionNode;

        const external = new Set<string>();
        collectExternalLabels(def, external);

        const deps: Record<string, DefinitionNode> =
          external.size > 0
            ? await getDefiningDefinitions({
                data: { labels: Array.from(external) },
              })
            : {};

        if (disposed) return;

        const uriMap = new Map<string, string>();

        for (const [label, depDef] of Object.entries(deps)) {
          const uri = fdHidden.addSymbolDeclaration(label);
          uriMap.set(label, uri);
          const rewrittenDep = rewriteNode(deepClone(depDef), uriMap, docId);
          fdHidden.addElement(rewrittenDep);
        }

        for (const symbol of def.for_symbols) {
          if (!uriMap.has(symbol) && !symbol.startsWith("http")) {
            const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
            fdVisible.addSymbolDeclaration(symbol);
            uriMap.set(symbol, hiddenUri);
          }
        }

        const rewritten = rewriteNode(deepClone(def), uriMap, docId);
        console.log(fdHidden.getStex())
        console.log(fdVisible.getStex())
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
  }, [ftmlAst, docId]);

  return (
    <>
      <div ref={hiddenRef} />
      <div ref={containerRef} />
    </>
  );
}
