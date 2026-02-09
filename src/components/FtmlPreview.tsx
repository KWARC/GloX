import { initFloDown } from "@/lib/flodownClient";
import { finalFloDown } from "@/server/parseUri";
import { FtmlStatement, normalizeToRoot } from "@/types/ftml.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FtmlStatement;
  docId: string;
  editable?: boolean;
  interactive?: boolean;
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

      fd = floDown.FloDown.fromUri(`http://temp?a=temp&d=${docId}&l=en`);

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

      const symbolName = block.for_symbols?.[0];
      if (!symbolName) return;

      const symbol = fd.addSymbolDeclaration(symbolName);

      const finalizedFTML = finalFloDown(block, symbol);

      fd.addElement(finalizedFTML);
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
  }, [ftmlAst, docId]);

  return <div ref={containerRef} />;
}
