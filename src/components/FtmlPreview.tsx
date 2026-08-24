import { initFloDown } from "@/lib/flodownClient";
import { documentUriFromGlox } from "@/lib/flodownUris";
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

type GloxFileIdentity = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
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

function identityFromContext(
  docId: string,
  symbolContext: FloDownSymbolContext | undefined,
): GloxFileIdentity {
  const fromHover = symbolContext?.hoverDefinitions?.find(
    (definition) => definition.cacheKey === docId,
  );
  if (fromHover) {
    return {
      futureRepo: fromHover.futureRepo,
      filePath: fromHover.filePath,
      fileName: fromHover.fileName,
      language: fromHover.language ?? "en",
    };
  }
  if (symbolContext) {
    return {
      futureRepo: symbolContext.futureRepo,
      filePath: symbolContext.filePath,
      fileName: symbolContext.fileName,
      language: symbolContext.language,
    };
  }
  return {
    futureRepo: "no/archive",
    filePath: "",
    fileName: docId.slice(0, 200) || "scratch",
    language: "en",
  };
}

function documentUriForIdentity(identity: GloxFileIdentity): string {
  return documentUriFromGlox({
    futureRepo: identity.futureRepo,
    filePath: identity.filePath,
    fileName: identity.fileName,
    language: identity.language,
  });
}

function declarationCount(block: Pick<ModuleLocalSymbolSource, "declaredSymbols">): number {
  return collectDeclaredSymbolsForDefinitionBlock(block).length;
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
  // Remaining issue (E-FTML-05): hidden documents hold definition bodies so local symref hover
  // does not mix those bodies into Title/Inhalt/Lernziele (D-FTML-03). If WASM always fetches
  // MathHub /content/fragment, this still 404s. Lab E7 same-fd / two-visible hover was not re-recorded.
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const fdVisibleRef = useRef<FloDownWasmBlock | null>(null);
  const fdHiddenRefs = useRef<FloDownWasmBlock[]>([]);

  useEffect(() => {
    const containerEl = containerRef.current;
    const hiddenEl = hiddenRef.current;
    if (!containerEl || !hiddenEl) return;

    let disposed = false;

    (async () => {
      try {
        const floDown = (await initFloDown()) as FloDownLib;
        if (disposed) return;

        const visibleIdentity = identityFromContext(docId, symbolContext);
        const visibleUri = documentUriForIdentity(visibleIdentity);
        const uriMap = new Map<string, string>();
        const hiddenFds: FloDownWasmBlock[] = [];

        hiddenEl.innerHTML = "";
        hiddenEl.style.display = "none";

        const mountOnFd = (
          fd: FloDownWasmBlock,
          identity: GloxFileIdentity,
          statement: unknown,
        ) => {
          const { replacements } = mountStatementOnFloDown(
            fd,
            statement,
            {
              futureRepo: identity.futureRepo,
              filePath: identity.filePath,
              fileName: identity.fileName,
            },
            { knownUris: uriMap },
          );
          mergeDeclarationUris(uriMap, replacements);
        };

        const createHiddenFd = (identity: GloxFileIdentity): FloDownWasmBlock => {
          const child = document.createElement("div");
          hiddenEl.appendChild(child);
          const fd = floDown.FloDown.fromUri(
            documentUriForIdentity(identity),
          ) as FloDownWasmBlock;
          fd.mountTo(child);
          hiddenFds.push(fd);
          return fd;
        };

        const hiddenHover = [...(symbolContext?.hoverDefinitions ?? [])]
          .filter((definition) => definition.cacheKey !== docId)
          .sort((a, b) => declarationCount(b) - declarationCount(a));

        const groups = new Map<string, FloDownHoverDefinition[]>();
        for (const definition of hiddenHover) {
          const uri = documentUriForIdentity({
            futureRepo: definition.futureRepo,
            filePath: definition.filePath,
            fileName: definition.fileName,
            language: definition.language ?? "en",
          });
          const list = groups.get(uri) ?? [];
          list.push(definition);
          groups.set(uri, list);
        }

        for (const [, blocks] of groups) {
          if (disposed) return;
          const first = blocks[0];
          const identity: GloxFileIdentity = {
            futureRepo: first.futureRepo,
            filePath: first.filePath,
            fileName: first.fileName,
            language: first.language ?? "en",
          };
          if (documentUriForIdentity(identity) === visibleUri) continue;
          const fd = createHiddenFd(identity);
          for (const block of blocks) {
            mountOnFd(fd, identity, block.statement);
          }
        }

        const declaredOnThisRow = new Set(declaredSymbols);
        const missing = collectShortUris(ftmlAst).filter(
          (label) => !uriMap.has(label) && !declaredOnThisRow.has(label),
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
            const identity: GloxFileIdentity = {
              futureRepo: dep.futureRepo,
              filePath: dep.filePath,
              fileName: dep.fileName,
              language: dep.language,
            };
            if (documentUriForIdentity(identity) === visibleUri) continue;
            const fd = createHiddenFd(identity);
            mountOnFd(fd, identity, dep.definition);
          }
        }

        if (disposed) return;

        const fdVisible = floDown.FloDown.fromUri(visibleUri) as FloDownWasmBlock;
        fdHiddenRefs.current = hiddenFds;
        fdVisibleRef.current = fdVisible;
        containerEl.innerHTML = "";
        fdVisible.mountTo(containerEl);

        mountStatementOnFloDown(
          fdVisible,
          ftmlAst,
          {
            futureRepo: visibleIdentity.futureRepo,
            filePath: visibleIdentity.filePath,
            fileName: visibleIdentity.fileName,
          },
          { knownUris: uriMap },
        );
      } catch (error) {
        if (disposed) return;
        console.error("FtmlPreview FloDown mount failed:", error);
      }
    })();

    return () => {
      disposed = true;

      for (const fd of fdHiddenRefs.current) {
        try {
          fd.clear();
        } catch {}
      }
      fdHiddenRefs.current = [];

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
