import { initFloDown } from "@/lib/flodownClient";
import { toExportBlock } from "@/server/ftml/generateStexFromFtml";
import { collectExternalSymbols } from "@/server/ftml/statementContent";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefinitionNode,
  FloDownStatement,
  isDefinitionNode,
  normalizeToRoot,
  PersistedBlock,
} from "@/types/floDown.types";

const FLODOWN_BACKEND_URL = "https://mmt.beta.vollki.kwarc.info";

export type DefinitionBlockInput = {
  id: string;
  statement: FloDownStatement;
  declaredSymbols: readonly string[];
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export type GenerateModuleTexInput = {
  moduleId: string;
  language: string;
  titleStatement: FloDownStatement;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
  futureRepo: string;
  modulesFilePath: string;
  definitionBlocks: DefinitionBlockInput[];
  singleDefinitionOnly?: boolean;
};

type FloDownWasmBlock = {
  addElement: (node: PersistedBlock | DefinitionNode) => void;
  addSymbolDeclaration: (name: string) => string;
  getStex(): string;
  clear: () => void;
};

type FloDownLib = {
  setBackendUrl: (url: string) => void;
  FloDown: { fromUri: (uri: string) => FloDownWasmBlock };
};

function buildDocumentUri(
  futureRepo: string,
  archive: string,
  documentId: string,
  language: string,
): string {
  return `http://${futureRepo}?a=${archive}&d=${documentId}&l=${language}`;
}

async function mountDefinitionDeps(
  fdHidden: FloDownWasmBlock,
  fdVisible: FloDownWasmBlock,
  block: DefinitionNode,
  identity: { futureRepo: string; filePath: string; fileName: string },
  declaredOnThisRow: Set<string>,
) {
  const external = collectExternalSymbols(block, declaredOnThisRow);
  const deps =
    external.length > 0
      ? await getDefiningDefinitions({ data: { labels: external } })
      : {};

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
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
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
      block,
      visibleUriMap,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      block,
      Array.from(declaredOnThisRow),
    ) as DefinitionNode,
  );
}

async function addBlock(
  fdHidden: FloDownWasmBlock,
  fdVisible: FloDownWasmBlock,
  block: PersistedBlock,
  identity: { futureRepo: string; filePath: string; fileName: string },
  declaredOnThisRow: Set<string>,
) {
  if (block.type === "paragraph") {
    fdVisible.addElement(
      toExportBlock(
        block,
        new Map(),
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
        block,
        Array.from(declaredOnThisRow),
      ) as PersistedBlock,
    );
    return;
  }

  if (isDefinitionNode(block)) {
    await mountDefinitionDeps(
      fdHidden,
      fdVisible,
      block,
      identity,
      declaredOnThisRow,
    );
  }
}

export async function generateModuleDescriptionTex(
  input: GenerateModuleTexInput,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;
  floDown.setBackendUrl(FLODOWN_BACKEND_URL);

  const fdHidden = floDown.FloDown.fromUri(
    buildDocumentUri("hidden", "temp", input.moduleId, input.language),
  );
  const fdVisible = floDown.FloDown.fromUri(
    buildDocumentUri(
      input.futureRepo,
      input.modulesFilePath,
      input.moduleId,
      input.language,
    ),
  );

  // Keep references alive until getStex() returns (see public/flodown/test.html).
  const alive: FloDownWasmBlock[] = [fdHidden, fdVisible];

  const moduleIdentity = {
    futureRepo: input.futureRepo,
    filePath: input.modulesFilePath,
    fileName: input.moduleId,
  };

  if (input.singleDefinitionOnly) {
    for (const defBlock of input.definitionBlocks) {
      const root = normalizeToRoot(defBlock.statement);
      for (const block of root.content) {
        if (!isDefinitionNode(block)) continue;
        await mountDefinitionDeps(
          fdHidden,
          fdVisible,
          block,
          {
            futureRepo: defBlock.futureRepo,
            filePath: defBlock.filePath,
            fileName: defBlock.fileName,
          },
          new Set(defBlock.declaredSymbols),
        );
      }
    }

    return alive[1].getStex().trimEnd();
  }

  for (const defBlock of input.definitionBlocks) {
    for (const sym of defBlock.declaredSymbols) {
      fdHidden.addSymbolDeclaration(sym);
      fdVisible.addSymbolDeclaration(sym);
    }
  }

  for (const statement of [
    input.titleStatement,
    input.inhaltStatement,
    input.lernzieleStatement,
  ]) {
    const root = normalizeToRoot(statement);
    for (const block of root.content) {
      await addBlock(fdHidden, fdVisible, block, moduleIdentity, new Set());
    }
  }

  for (const defBlock of input.definitionBlocks) {
    const root = normalizeToRoot(defBlock.statement);
    for (const block of root.content) {
      if (!isDefinitionNode(block)) continue;
      await mountDefinitionDeps(
        fdHidden,
        fdVisible,
        block,
        {
          futureRepo: defBlock.futureRepo,
          filePath: defBlock.filePath,
          fileName: defBlock.fileName,
        },
        new Set(defBlock.declaredSymbols),
      );
    }
  }

  return alive[1].getStex().trimEnd();
}

export async function generateModuleDescriptionTexPreview(
  input: GenerateModuleTexInput,
) {
  const tex = await generateModuleDescriptionTex(input);

  return {
    moduleTex: {
      fileName: `${input.moduleId}.${input.language}.tex`,
      tex,
    },
  };
}
