import { initFloDown } from "@/lib/flodownClient";
import { toExportBlock } from "@/server/ftml/generateStexFromFtml";
import {
  collectExternalSymbols,
} from "@/server/ftml/statementContent";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefinitionNode,
  FloDownStatement,
  isDefinitionNode,
  normalizeToRoot,
  PersistedBlock
} from "@/types/floDown.types";
import { useEffect, useRef } from "react";

interface FtmlPreviewProps {
  ftmlAst: FloDownStatement;
  docId: string;
  declaredSymbols?: string[];
}

type FloDownWasmBlock = {
  mountTo: (el: HTMLElement) => void;
  addElement: (node: PersistedBlock | DefinitionNode) => void;
  addSymbolDeclaration: (name: string) => string;
  getStex(): string;
  getFtml(): string;
  clear: () => void;
  clearText: () => void;
};

type FloDownLib = {
  setBackendUrl: (url: string) => void;
  FloDown: { fromUri: (uri: string) => FloDownWasmBlock };
};

export function FtmlPreview({
  ftmlAst,
  docId,
  declaredSymbols = [],
}: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const fdHiddenRef = useRef<FloDownWasmBlock | null>(null);
  const fdVisibleRef = useRef<FloDownWasmBlock | null>(null);

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
          fdVisible.addElement(block);
          continue;
        }

        if (!isDefinitionNode(block)) continue;

        const def = block as DefinitionNode;
        const external = collectExternalSymbols(def, declaredOnThisRow);

        const deps =
          external.length > 0
            ? await getDefiningDefinitions({
                data: { labels: external },
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

          fdHidden.addElement(
            toExportBlock(
              dep.definition,
              hiddenUriMap,
              "temp",
              "temp",
              docId,
              dep.definition,
              dep.declaredSymbols,
            ) as DefinitionNode,
          );
        }

        for (const symbol of declaredOnThisRow) {
          if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
            const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
            const visibleUri = fdVisible.addSymbolDeclaration(symbol);

            hiddenUriMap.set(symbol, hiddenUri);
            visibleUriMap.set(symbol, visibleUri);
          }
        }

        fdVisible.addElement(
          toExportBlock(
            def,
            visibleUriMap,
            "temp",
            "temp",
            docId,
            def,
            Array.from(declaredOnThisRow),
          ) as DefinitionNode,
        );
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
