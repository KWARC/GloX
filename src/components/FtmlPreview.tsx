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

function isHttpUri(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function collectExternalLabels(
  node: FtmlNode | FtmlContent,
  acc: Set<string>,
): void {
  if (typeof node === "string") return;

  if (node.type === "symref") {
    const symref = node as SymrefNode;
    if (symref.uri && !isHttpUri(symref.uri)) {
      acc.add(symref.uri);
    }
  }

  if (
    isDefiniendumNode(node) &&
    node.symdecl === false &&
    node.uri &&
    !isHttpUri(node.uri)
  ) {
    acc.add(node.uri);
  }

  if (node.content) {
    for (const child of node.content) {
      collectExternalLabels(child, acc);
    }
  }
}

function rewriteDefinitionNode(
  def: DefinitionNode,
  uriMap: Map<string, string>,
): DefinitionNode {
  return {
    ...def,
    for_symbols: def.for_symbols.map((s) => uriMap.get(s) ?? s),
    content: rewriteContentArray(def.content, uriMap),
  };
}

function rewriteDefiniendumNode(
  node: DefiniendumNode,
  uriMap: Map<string, string>,
): DefiniendumNode {
  return {
    ...node,
    uri: uriMap.get(node.uri) ?? node.uri,
    content: rewriteContentArray(node.content, uriMap),
  };
}

function rewriteSymrefNode(
  node: SymrefNode,
  uriMap: Map<string, string>,
): SymrefNode {
  if (isHttpUri(node.uri)) return node;

  const resolved = uriMap.get(node.uri);

  if (!resolved) {
    throw new Error(`Unresolved symbol: ${node.uri}`);
  }

  return {
    ...node,
    uri: resolved,
    content: rewriteContentArray(node.content, uriMap),
  };
}

function rewriteFtmlNode(
  node: FtmlNode,
  uriMap: Map<string, string>,
): FtmlNode {
  if (isDefinitionNode(node)) return rewriteDefinitionNode(node, uriMap);
  if (isDefiniendumNode(node)) return rewriteDefiniendumNode(node, uriMap);
  if (node.type === "symref")
    return rewriteSymrefNode(node as SymrefNode, uriMap);

  if (node.content) {
    return {
      ...node,
      content: rewriteContentArray(node.content, uriMap),
    };
  }

  return node;
}

function rewriteContentArray(
  content: FtmlContent[],
  uriMap: Map<string, string>,
): FtmlContent[] {
  return content.map((item) => {
    if (typeof item === "string") return item;
    return rewriteFtmlNode(item, uriMap);
  });
}

type FloDownLib = {
  setBackendUrl: (url: string) => void;
  FloDown: { fromUri: (uri: string) => FloDownBlock };
};

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
      const block = root.content[0];
      if (!block) return;

      if (block.type === "paragraph") {
        fdVisible.addElement(block as ParagraphNode);
        return;
      }

      if (!isDefinitionNode(block)) return;

      const defBlock = block as DefinitionNode;
      const externalLabels = new Set<string>();
      collectExternalLabels(defBlock, externalLabels);

      const definingNodes =
        externalLabels.size > 0
          ? await getDefiningDefinitions({
              data: { labels: Array.from(externalLabels) },
            })
          : {};

      if (disposed) return;

      const uriMap = new Map<string, string>();

      for (const [label, depDef] of Object.entries(definingNodes)) {
        const uri = fdHidden.addSymbolDeclaration(label);
        uriMap.set(label, uri);

        const rewrittenDep = rewriteFtmlNode(depDef, uriMap);
        fdHidden.addElement(rewrittenDep);
      }

      for (const symbolName of defBlock.for_symbols) {
        if (!uriMap.has(symbolName)) {
          const uriHidden = fdHidden.addSymbolDeclaration(symbolName);
          fdVisible.addSymbolDeclaration(symbolName);

          uriMap.set(symbolName, uriHidden);
        }
      }

      const rewritten = rewriteFtmlNode(defBlock, uriMap);
      fdVisible.addElement(rewritten);
      // console.log(fdVisible.getStex())
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
