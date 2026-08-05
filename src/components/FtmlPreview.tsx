import { initFloDown } from "@/lib/flodownClient";
import {
  collectDeclaredSymbolsForDefinitionBlock,
  type ModuleLocalSymbolSource,
} from "@/lib/moduleLocalSymbols";
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

export type FloDownHoverDefinition = ModuleLocalSymbolSource & {
  cacheKey: string;
};

export type FloDownSymbolContext = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  registeredSymbols: readonly string[];
  localSymbolUriMap: ReadonlyMap<string, string>;
  hoverDefinitions: readonly FloDownHoverDefinition[];
};

function symbolContextDep(context: FloDownSymbolContext | undefined): string {
  if (!context) return "";
  return [
    context.futureRepo,
    context.filePath,
    context.fileName,
    context.language,
    context.registeredSymbols.join("\0"),
    [...context.localSymbolUriMap.entries()]
      .map(([label, uri]) => `${label}\0${uri}`)
      .join("\0"),
    context.hoverDefinitions
      .map(
        (definition) =>
          `${definition.cacheKey}\0${definition.futureRepo}\0${definition.filePath}\0${definition.fileName}\0${definition.declaredSymbols.join(",")}\0${JSON.stringify(definition.statement)}`,
      )
      .join("\0"),
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
  FloDown: { fromUri: (uri: string) => FloDownWasmBlock };
};

async function mountHoverDefinitionInHidden(
  fdHidden: FloDownWasmBlock,
  defBlock: FloDownHoverDefinition,
): Promise<Map<string, string>> {
  const resolvedUris = new Map<string, string>();
  const root = normalizeToRoot(defBlock.statement);
  const declaredOnThisRow = new Set(
    collectDeclaredSymbolsForDefinitionBlock(defBlock),
  );

  for (const block of root.content) {
    if (!isDefinitionNode(block)) continue;

    const def = block as DefinitionNode;
    const external = collectExternalSymbols(def, declaredOnThisRow);

    const deps =
      external.length > 0
        ? await getDefiningDefinitions({
            data: { labels: external },
          })
        : {};

    const hiddenUriMap = new Map<string, string>();

    for (const dep of Object.values(deps)) {
      for (const label of dep.declaredSymbols) {
        if (!hiddenUriMap.has(label)) {
          const hiddenUri = fdHidden.addSymbolDeclaration(label);
          if (hiddenUri) {
            hiddenUriMap.set(label, hiddenUri);
            resolvedUris.set(label, hiddenUri);
          }
        }
      }

      fdHidden.addElement(
        toExportBlock(
          dep.definition,
          hiddenUriMap,
          defBlock.futureRepo,
          defBlock.filePath,
          defBlock.fileName,
          dep.definition,
          dep.declaredSymbols,
        ) as DefinitionNode,
      );
    }

    for (const symbol of declaredOnThisRow) {
      if (!symbol.startsWith("http") && !hiddenUriMap.has(symbol)) {
        const hiddenUri = fdHidden.addSymbolDeclaration(symbol);
        if (hiddenUri) {
          hiddenUriMap.set(symbol, hiddenUri);
          resolvedUris.set(symbol, hiddenUri);
        }
      } else if (hiddenUriMap.has(symbol)) {
        resolvedUris.set(symbol, hiddenUriMap.get(symbol)!);
      }
    }

    fdHidden.addElement(
      toExportBlock(
        def,
        hiddenUriMap,
        defBlock.futureRepo,
        defBlock.filePath,
        defBlock.fileName,
        def,
        Array.from(declaredOnThisRow),
      ) as DefinitionNode,
    );
  }

  return resolvedUris;
}

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

      const statementSymbolUriMap = symbolContext
        ? new Map(symbolContext.localSymbolUriMap)
        : null;

      if (symbolContext) {
        for (const defBlock of symbolContext.hoverDefinitions) {
          const resolvedUris = await mountHoverDefinitionInHidden(
            fdHidden,
            defBlock,
          );
          if (disposed) return;
          for (const [label, uri] of resolvedUris) {
            statementSymbolUriMap!.set(label, uri);
          }
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
          if (symbolContext && statementSymbolUriMap) {
            fdVisible.addElement(
              toExportBlock(
                block,
                statementSymbolUriMap,
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
