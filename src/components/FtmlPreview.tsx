import { initFloDown } from "@/lib/flodownClient";
import {
  createFloDownDocument,
  declareSymbol,
  exportIdentityFromGlox,
  hiddenScratchDocumentUri,
  scratchDocumentUri,
} from "@/lib/flodownUris";
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
  FloDownAstNode,
  FloDownStatement,
  isDefinitionNode,
  normalizeToRoot,
  ParagraphNode,
} from "@/types/floDown.types";
import { useEffect, useRef } from "react";

const EMPTY_DECLARED_SYMBOLS: string[] = [];

export type FloDownHoverDefinition = ModuleLocalSymbolSource & {
  cacheKey: string;
  language?: string;
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
  addSymbolDeclaration: (name: string) => string | undefined;
  getStex(): string;
  getFtml(): string;
  clear: () => void;
  clearText: () => void;
};

type FloDownLib = {
  FloDown: {
    fromUri: (uri: string) => FloDownWasmBlock;
    fromPath: (
      archive: string,
      path: string | null | undefined,
      name: string,
      lang: wasm_bindgen.Language,
    ) => FloDownWasmBlock | undefined;
  };
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
  const language = defBlock.language ?? "en";

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
          const hiddenUri = declareSymbol(fdHidden, label, hiddenUriMap);
          if (hiddenUri) {
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
          language,
        ) as DefinitionNode,
      );
    }

    for (const symbol of declaredOnThisRow) {
      if (!symbol.startsWith("http") && !hiddenUriMap.has(symbol)) {
        const hiddenUri = declareSymbol(fdHidden, symbol, hiddenUriMap);
        if (hiddenUri) {
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
        language,
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
      try {
        const floDown = (await initFloDown()) as FloDownLib;
        if (disposed) return;

      const previewLanguage = symbolContext?.language ?? "en";
      const hiddenDocUri = symbolContext
        ? hiddenScratchDocumentUri(symbolContext.fileName, previewLanguage)
        : scratchDocumentUri(docId, previewLanguage);

      const fdHidden = floDown.FloDown.fromUri(hiddenDocUri);
      hiddenEl.innerHTML = "";
      fdHidden.mountTo(hiddenEl);
      hiddenEl.style.display = "none";

      const fdVisible = symbolContext
        ? (createFloDownDocument(
            floDown.FloDown,
            exportIdentityFromGlox({
              futureRepo: symbolContext.futureRepo,
              filePath: symbolContext.filePath,
              fileName: symbolContext.fileName,
              language: symbolContext.language,
            }),
          ) as FloDownWasmBlock)
        : (floDown.FloDown.fromUri(
            scratchDocumentUri(docId, previewLanguage),
          ) as FloDownWasmBlock);

      fdHiddenRef.current = fdHidden;
      fdVisibleRef.current = fdVisible;
      containerEl.innerHTML = "";
      fdVisible.mountTo(containerEl);

      const uriMap = new Map(symbolContext?.localSymbolUriMap ?? []);

      if (symbolContext) {
        for (const defBlock of symbolContext.hoverDefinitions) {
          const resolvedUris = await mountHoverDefinitionInHidden(
            fdHidden,
            defBlock,
          );
          if (disposed) return;
          for (const [label, uri] of resolvedUris) {
            uriMap.set(label, uri);
          }
        }
      }

      const root = normalizeToRoot(ftmlAst);
      const declaredOnThisRow = new Set(declaredSymbols);
      const exportIdentity = symbolContext
        ? {
            futureRepo: symbolContext.futureRepo,
            filePath: symbolContext.filePath,
            fileName: symbolContext.fileName,
            language: symbolContext.language,
          }
        : {
            futureRepo: "no/archive",
            filePath: "",
            fileName: docId,
            language: previewLanguage,
          };

      const previewBlocks = root.content as Array<{
        type: string;
        [key: string]: unknown;
      }>;

      for (const block of previewBlocks) {
        if (disposed) return;

        if (block.type === "heading") {
          const heading = block as {
            type: "heading";
            content: wasm_bindgen.Inline[];
          };
          fdVisible.addElement({
            type: "heading",
            level: "Section" as unknown as wasm_bindgen.HeadingLevel,
            content: heading.content,
          });
          continue;
        }

        if (block.type === "paragraph") {
          fdVisible.addElement(
            toExportBlock(
              block as ParagraphNode,
              uriMap,
              exportIdentity.futureRepo,
              exportIdentity.filePath,
              exportIdentity.fileName,
              block as ParagraphNode,
              [],
              exportIdentity.language,
            ),
          );
          continue;
        }

        if (!isDefinitionNode(block as FloDownAstNode)) continue;

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
        const scratchIdentity = {
          futureRepo: "no/archive",
          filePath: null as string | null,
          fileName: docId,
          language: previewLanguage,
        };

        for (const dep of Object.values(deps)) {
          for (const label of dep.declaredSymbols) {
            if (!defHiddenUriMap.has(label)) {
              const hiddenUri = declareSymbol(fdHidden, label, defHiddenUriMap);
              if (hiddenUri) {
                defVisibleUriMap.set(label, hiddenUri);
              }
            }
          }

          fdHidden.addElement(
            toExportBlock(
              dep.definition,
              defHiddenUriMap,
              scratchIdentity.futureRepo,
              scratchIdentity.filePath ?? "",
              scratchIdentity.fileName,
              dep.definition,
              dep.declaredSymbols,
              scratchIdentity.language,
            ) as DefinitionNode,
          );
        }

        for (const symbol of declaredOnThisRow) {
          if (!symbol.startsWith("http") && !defVisibleUriMap.has(symbol)) {
            declareSymbol(fdHidden, symbol, defHiddenUriMap);
            declareSymbol(fdVisible, symbol, defVisibleUriMap);
          }
        }

        fdVisible.addElement(
          toExportBlock(
            def,
            defVisibleUriMap,
            scratchIdentity.futureRepo,
            scratchIdentity.filePath ?? "",
            scratchIdentity.fileName,
            def,
            Array.from(declaredOnThisRow),
            scratchIdentity.language,
          ) as DefinitionNode,
        );
      }
      } catch (error) {
        if (disposed) return;
        console.error("FtmlPreview FloDown mount failed:", error);
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
