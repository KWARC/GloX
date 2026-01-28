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
}

export function FtmlPreview({ ftmlAst, editable = false }: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const floDownRef = useRef<any>(null);

  useEffect(() => {
    if (!ftmlAst || !containerRef.current) return;

    let disposed = false;

    initFloDown().then((floDown) => {
      if (disposed || !containerRef.current) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      containerRef.current.innerHTML = "";

      const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

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

      fd.mountTo(containerRef.current);
      floDownRef.current = fd;
       console.log(fd.getStex());
    });

    return () => {
      disposed = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      floDownRef.current = null;
    };
  }, [ftmlAst, editable]);

  return (
    <div
      ref={containerRef}
      style={{
        display: "contents",
        userSelect: editable ? "text" : "auto",
        cursor: editable ? "text" : "auto",
      }}
    />
  );
}
