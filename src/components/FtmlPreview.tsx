import { initFloDown } from "@/lib/flodownClient";
import {
  hiddenScratchDocumentUri,
  scratchDocumentUri,
} from "@/lib/flodownUris";
import { collectDeclaredSymbolsForDefinitionBlock } from "@/lib/moduleLocalSymbols";
import type { ModuleLocalSymbolSource } from "@/lib/moduleLocalSymbols";
import { mountStatementOnFloDown } from "@/lib/prepareFloDownStatement";
import {
  getInlineContent,
  isHttp,
  walkInlines,
} from "@/server/ftml/statementContent";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import type { FloDownStatement } from "@/types/floDown.types";
import { normalizeToRoot } from "@/types/floDown.types";
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
  hoverDefinitions?: readonly FloDownHoverDefinition[];
};

type FloDownIdentity = {
  futureRepo: string;
  filePath: string;
  fileName: string;
};

function collectShortUris(statement: FloDownStatement): string[] {
  const found = new Set<string>();
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (typeof item === "string") return;
      if (
        (item.type === "symref" || item.type === "definiendum") &&
        item.uri &&
        !isHttp(item.uri)
      ) {
        found.add(item.uri);
      }
    });
  }

  return [...found];
}

function labelsCoveredByHoverDefinitions(
  hoverDefinitions: readonly FloDownHoverDefinition[] | undefined,
): Set<string> {
  const covered = new Set<string>();
  for (const defBlock of hoverDefinitions ?? []) {
    for (const label of collectDeclaredSymbolsForDefinitionBlock(defBlock)) {
      covered.add(label);
    }
  }
  return covered;
}

function mergeDeclarationUris(
  uriMap: Map<string, string>,
  replacements: { from: string; to: string; reason: string }[],
): void {
  for (const item of replacements) {
    if (
      item.reason === "addSymbolDeclaration" ||
      item.reason === "knownUriMap"
    ) {
      uriMap.set(item.from, item.to);
    }
  }
}

function symbolContextDep(context: FloDownSymbolContext | undefined): string {
  if (!context) return "";
  return [
    context.futureRepo,
    context.filePath,
    context.fileName,
    context.language,
    ...(context.hoverDefinitions ?? []).map(
      (definition) =>
        `${definition.cacheKey}\0${JSON.stringify(definition.statement)}`,
    ),
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
  };
};

export function FtmlPreview({
  ftmlAst,
  docId,
  declaredSymbols = EMPTY_DECLARED_SYMBOLS,
  symbolContext,
}: FtmlPreviewProps) {
  // Remaining issue (E-FTML-05): hidden document holds definition bodies so local symref hover
  // does not mix those bodies into Title/Inhalt/Lernziele (D-FTML-03). If WASM always fetches
  // MathHub /content/fragment, this still 404s. Lab E7 same-fd / two-visible hover was not re-recorded.
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const fdVisibleRef = useRef<FloDownWasmBlock | null>(null);
  const fdHiddenRef = useRef<FloDownWasmBlock | null>(null);

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
        const identity: FloDownIdentity = symbolContext
          ? {
              futureRepo: symbolContext.futureRepo,
              filePath: symbolContext.filePath,
              fileName: symbolContext.fileName,
            }
          : {
              futureRepo: "no/archive",
              filePath: "",
              fileName: docId,
            };

        const fdHidden = floDown.FloDown.fromUri(
          hiddenScratchDocumentUri(docId, previewLanguage),
        ) as FloDownWasmBlock;
        hiddenEl.innerHTML = "";
        fdHidden.mountTo(hiddenEl);
        hiddenEl.style.display = "none";

        const fdVisible = floDown.FloDown.fromUri(
          scratchDocumentUri(docId, previewLanguage),
        ) as FloDownWasmBlock;

        fdHiddenRef.current = fdHidden;
        fdVisibleRef.current = fdVisible;
        containerEl.innerHTML = "";
        fdVisible.mountTo(containerEl);

        const uriMap = new Map<string, string>();

        for (const defBlock of symbolContext?.hoverDefinitions ?? []) {
          if (disposed) return;
          const { replacements } = mountStatementOnFloDown(
            fdHidden,
            defBlock.statement,
            {
              futureRepo: defBlock.futureRepo,
              filePath: defBlock.filePath,
              fileName: defBlock.fileName,
            },
          );
          mergeDeclarationUris(uriMap, replacements);
        }

        const covered = labelsCoveredByHoverDefinitions(
          symbolContext?.hoverDefinitions,
        );
        const declaredOnThisRow = new Set(declaredSymbols);
        const missing = collectShortUris(ftmlAst).filter(
          (label) => !covered.has(label) && !declaredOnThisRow.has(label),
        );

        if (missing.length > 0) {
          const deps = await getDefiningDefinitions({
            data: { labels: missing },
          });
          if (disposed) return;

          const uniqueDefs = new Map(
            Object.values(deps).map((dep) => [
              JSON.stringify(dep.definition),
              dep,
            ]),
          );
          for (const dep of uniqueDefs.values()) {
            const { replacements } = mountStatementOnFloDown(
              fdHidden,
              dep.definition,
              identity,
            );
            mergeDeclarationUris(uriMap, replacements);
          }
        }

        if (disposed) return;

        mountStatementOnFloDown(fdVisible, ftmlAst, identity, {
          knownUris: uriMap,
        });
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
