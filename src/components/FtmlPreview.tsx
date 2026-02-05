import { initFloDown } from "@/lib/flodownClient";
import {
  addSymbols,
  removeSymdeclForFloDown,
  replaceUris,
} from "@/server/ftml/normalizeFtml";
import { FtmlStatement, RootNode, normalizeToRoot } from "@/types/ftml.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FtmlStatement;
  docId: string;
  editable?: boolean;
  interactive?: boolean;
}

export function FtmlPreview({
  ftmlAst,
  docId,
  editable = false,
  interactive = true,
}: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !ftmlAst) return;

    let disposed = false;
    let fd: any = null;

    (async () => {
      const floDown = await initFloDown();
      if (disposed || !containerRef.current) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      fd = floDown.FloDown.fromUri(`http://temp?a=temp&d=${docId}&l=en`);
      containerRef.current.innerHTML = "";
      fd.mountTo(containerRef.current);

      const normalized: RootNode = normalizeToRoot(ftmlAst);
      const symbols = addSymbols(normalized);

      const uriMap = new Map<string, string>();
      for (const name of symbols) {
        const uri = fd.addSymbolDeclaration(name);
        if (uri) {
          uriMap.set(name, uri);
        }
      }

      const resolved = replaceUris(structuredClone(normalized), uriMap);

      const sanitized = removeSymdeclForFloDown(resolved) as RootNode;

      for (const element of sanitized.content) {
        fd.addElement(element);
      }
    })();

    return () => {
      disposed = true;

      if (fd) {
        try {
          fd.clear();
        } catch {}
        fd = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [ftmlAst]);

  return (
    <div
      ref={containerRef}
      style={{
        userSelect: interactive ? (editable ? "text" : "auto") : "none",
        cursor: interactive ? (editable ? "text" : "auto") : "default",
        pointerEvents: interactive ? "auto" : "none",
        opacity: interactive ? 1 : 0.7,
      }}
    />
  );
}
