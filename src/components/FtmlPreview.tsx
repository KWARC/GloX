import { initFloDown } from "@/lib/flodownClient";
import { FtmlStatement, normalizeToRoot } from "@/types/ftml.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FtmlStatement;
  docId: string;
}

function rewriteUris(node: any, uriMap: Map<string, string>): any {
  if (Array.isArray(node)) {
    return node.map((n) => rewriteUris(n, uriMap));
  }

  if (!node || typeof node !== "object") return node;

  if (node.type === "definition") {
    return {
      ...node,
      for_symbols: Array.isArray(node.for_symbols)
        ? node.for_symbols.map((s: string) => uriMap.get(s) ?? s)
        : [],
      content: rewriteUris(node.content, uriMap),
    };
  }

  if (node.type === "definiendum" || node.type === "symref") {
    return {
      ...node,
      uri: uriMap.get(node.uri) ?? node.uri,
      content: rewriteUris(node.content, uriMap),
    };
  }

  if (node.content) {
    return {
      ...node,
      content: rewriteUris(node.content, uriMap),
    };
  }

  return node;
}

export function FtmlPreview({ ftmlAst, docId }: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let fd: any = null;

    (async () => {
      const floDown = await initFloDown();
      if (disposed || !containerRef.current) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      fd = floDown.FloDown.fromUri(
        `http://temp?a=temp&d=${docId}&l=en`
      );

      containerRef.current.innerHTML = "";
      fd.mountTo(containerRef.current);

      const root = normalizeToRoot(ftmlAst);
      const block = root.content[0];
      if (!block) return;

      if (block.type === "paragraph") {
        fd.addElement(block);
        return;
      }

      if (block.type !== "definition") return;

      const uriMap = new Map<string, string>();

      if (Array.isArray(block.for_symbols)) {
        for (const symbolName of block.for_symbols) {
          if (!symbolName.startsWith("http")) {
            const declaredUri = fd.addSymbolDeclaration(symbolName);
            uriMap.set(symbolName, declaredUri);
          }
        }
      }

      const rewritten = rewriteUris(block, uriMap);

      fd.addElement(rewritten);
    })();

    return () => {
      disposed = true;
      if (fd) {
        try {
          fd.clear();
        } catch {}
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [ftmlAst]);

  return <div ref={containerRef} />;
}