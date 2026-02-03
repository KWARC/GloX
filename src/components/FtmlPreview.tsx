import { initFloDown } from "@/lib/flodown-client";
import {
  collectLocalSymbols,
  replaceLocalUris,
} from "@/server/ftml/normalizeFtml";
import { normalizeToRoot } from "@/types/ftml.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: any;
  editable?: boolean;
  interactive?: boolean;
}

export function FtmlPreview({
  ftmlAst,
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

      fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

      containerRef.current.innerHTML = "";
      fd.mountTo(containerRef.current);

      const normalized = normalizeToRoot(ftmlAst);
      const symbols = collectLocalSymbols(normalized);

      const uriMap = new Map<string, string>();
      for (const name of symbols) {
        uriMap.set(name, fd.addSymbolDeclaration(name));
      }

      const resolved = replaceLocalUris(structuredClone(normalized), uriMap);

      for (const element of resolved.content) {
        fd.addElement(element);
      }
    })();

    return () => {
      disposed = true;

      if (fd) {
        try {
          fd.clear(); 
        } catch {
        }
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
