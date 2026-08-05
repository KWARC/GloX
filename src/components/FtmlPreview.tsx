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
  isHeadingNode,
  normalizeToRoot,
} from "@/types/floDown.types";
import { useEffect, useRef } from "react";

const EMPTY_DECLARED_SYMBOLS: string[] = [];

export type FloDownSymbolContext = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  registeredSymbols: readonly string[];
};

function symbolContextDep(context: FloDownSymbolContext | undefined): string {
  if (!context) return "";
  return [
    context.futureRepo,
    context.filePath,
    context.fileName,
    context.language,
    context.registeredSymbols.join("\0"),
  ].join("\0");
}

interface FtmlPreviewProps {
  ftmlAst: FloDownStatement;
  docId: string;
  declaredSymbols?: string[];
  symbolContext?: FloDownSymbolContext;
}

type FloDownWasmBlock = {
  mountTo: (el: HTMLElement) => void;
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
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
  declaredSymbols = EMPTY_DECLARED_SYMBOLS,
  symbolContext,
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

      const visibleDocUri = symbolContext
        ? `http://${symbolContext.futureRepo}?a=${symbolContext.filePath}&d=${symbolContext.fileName}&l=${symbolContext.language}`
        : `http://temp-visible?a=temp&d=${docId}&l=en`;
      const hiddenDocUri = symbolContext
        ? `http://hidden?a=temp&d=${symbolContext.fileName}&l=${symbolContext.language}`
        : `http://temp-hidden?a=temp&d=${docId}&l=en`;

      const fdHidden = floDown.FloDown.fromUri(hiddenDocUri);
      hiddenEl.innerHTML = "";
      fdHidden.mountTo(hiddenEl);
      hiddenEl.style.display = "none";

      const fdVisible = floDown.FloDown.fromUri(visibleDocUri);
      fdHiddenRef.current = fdHidden;
      fdVisibleRef.current = fdVisible;
      containerEl.innerHTML = "";
      fdVisible.mountTo(containerEl);

      if (symbolContext) {
        for (const symbol of symbolContext.registeredSymbols) {
          if (symbol.startsWith("http://") || symbol.startsWith("https://")) {
            continue;
          }
          fdHidden.addSymbolDeclaration(symbol);
          fdVisible.addSymbolDeclaration(symbol);
        }
      }

      const root = normalizeToRoot(ftmlAst);
      const declaredOnThisRow = new Set(declaredSymbols);

      for (const block of root.content) {
        if (disposed) return;

        if (isHeadingNode(block)) {
          fdVisible.addElement(block);
          continue;
        }

        if (block.type === "paragraph") {
          if (symbolContext) {
            fdVisible.addElement(
              toExportBlock(
                block,
                new Map(),
                symbolContext.futureRepo,
                symbolContext.filePath,
                symbolContext.fileName,
                block,
                [],
              ),
            );
          } else {
            fdVisible.addElement(block);
          }
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

        const defHiddenUriMap = new Map<string, string>();
        const defVisibleUriMap = new Map<string, string>();

        for (const dep of Object.values(deps)) {
          for (const label of dep.declaredSymbols) {
            if (!defHiddenUriMap.has(label)) {
              const hiddenUri = fdHidden.addSymbolDeclaration(label);
              defHiddenUriMap.set(label, hiddenUri);
              defVisibleUriMap.set(label, hiddenUri);
            }
          }

          fdHidden.addElement(
            toExportBlock(
              dep.definition,
              defHiddenUriMap,
              "temp",
              "temp",
              docId,
              dep.definition,
              dep.declaredSymbols,
            ) as DefinitionNode,
          );
        }

        for (const symbol of declaredOnThisRow) {
          if (!symbol.startsWith("http") && !defVisibleUriMap.has(symbol)) {
            const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
            const visibleUri = fdVisible.addSymbolDeclaration(symbol);

            defHiddenUriMap.set(symbol, hiddenUri);
            defVisibleUriMap.set(symbol, visibleUri);
          }
        }

        fdVisible.addElement(
          toExportBlock(
            def,
            defVisibleUriMap,
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
  }, [ftmlAst, docId, declaredSymbols, symbolContextDep(symbolContext)]);

  return (
    <>
      <div ref={hiddenRef} />
      <div ref={containerRef} />
    </>
  );
}
