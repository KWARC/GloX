import { initFloDown } from "@/lib/flodownClient";
import {
  createFloDownDocument,
  declareSymbol,
  exportIdentityFromGlox,
  hiddenScratchDocumentUri,
} from "@/lib/flodownUris";
import { buildModuleLocalSymbolUriMap } from "@/lib/moduleLocalSymbols";
import { toExportBlock } from "@/server/ftml/generateStexFromFtml";
import { collectExternalSymbols } from "@/server/ftml/statementContent";
import { getDefiningDefinitions } from "@/serverFns/getSymbolUriMap.server";
import {
  DefinitionNode,
  FloDownStatement,
  HeadingNode,
  isDefinitionNode,
  isHeadingNode,
  normalizeToRoot,
  PersistedBlock,
} from "@/types/floDown.types";

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
};

export type TexFilePreview = {
  fileName: string;
  tex: string;
  ftmlStatement: FloDownStatement;
  declaredSymbols?: readonly string[];
};

type ModulePreviewBlock = PersistedBlock | HeadingNode;

type FloDownWasmBlock = {
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
  addSymbolDeclaration: (name: string) => string | undefined;
  getStex(): string;
  clear: () => void;
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

function sectionHeading(title: string): HeadingNode {
  return {
    type: "heading",
    // FloDown WASM serde expects a variant name ("Section"), not HeadingLevel.Section = 0.
    level: "Section" as unknown as HeadingNode["level"],
    content: [title],
  };
}

export function buildModuleDescriptionStatement(
  input: Pick<
    GenerateModuleTexInput,
    "titleStatement" | "inhaltStatement" | "lernzieleStatement"
  >,
): FloDownStatement {
  const sections = [
    { heading: "Title", statement: input.titleStatement },
    { heading: "Inhalt", statement: input.inhaltStatement },
    {
      heading: "Lernziele und Kompetenzen",
      statement: input.lernzieleStatement,
    },
  ];

  const content: ModulePreviewBlock[] = [];
  for (const section of sections) {
    content.push(sectionHeading(section.heading));
    content.push(...normalizeToRoot(section.statement).content);
  }

  return content as FloDownStatement;
}

async function mountDefinitionDeps(
  fdHidden: FloDownWasmBlock,
  fdVisible: FloDownWasmBlock,
  block: DefinitionNode,
  identity: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  },
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
        const hiddenUri = declareSymbol(fdHidden, label, hiddenUriMap);
        if (hiddenUri) {
          visibleUriMap.set(label, hiddenUri);
        }
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
        identity.language,
      ) as DefinitionNode,
    );
  }

  for (const symbol of declaredOnThisRow) {
    if (!symbol.startsWith("http") && !visibleUriMap.has(symbol)) {
      declareSymbol(fdHidden, symbol, hiddenUriMap);
      declareSymbol(fdVisible, symbol, visibleUriMap);
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
      identity.language,
    ) as DefinitionNode,
  );
}

async function addModulePreviewBlock(
  fdVisible: FloDownWasmBlock,
  block: ModulePreviewBlock,
  identity: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  },
  localSymbolUriMap: Map<string, string>,
) {
  if (isHeadingNode(block)) {
    fdVisible.addElement(block);
    return;
  }

  if (block.type !== "paragraph") return;

  fdVisible.addElement(
    toExportBlock(
      block,
      localSymbolUriMap,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      block,
      [],
      identity.language,
    ) as PersistedBlock,
  );
}

async function initFloDownBlocks(
  floDown: FloDownLib,
  visibleIdentity: ReturnType<typeof exportIdentityFromGlox>,
  hiddenUri: string,
): Promise<{ fdHidden: FloDownWasmBlock; fdVisible: FloDownWasmBlock }> {
  const fdHidden = floDown.FloDown.fromUri(hiddenUri) as FloDownWasmBlock;
  const fdVisible = createFloDownDocument(
    floDown.FloDown,
    visibleIdentity,
  ) as FloDownWasmBlock;
  return { fdHidden, fdVisible };
}

export async function generateModuleDescriptionModuleTex(
  input: GenerateModuleTexInput,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;

  const moduleIdentity = exportIdentityFromGlox({
    futureRepo: input.futureRepo,
    filePath: input.modulesFilePath,
    fileName: input.moduleId,
    language: input.language,
  });

  const fdVisible = createFloDownDocument(
    floDown.FloDown,
    moduleIdentity,
  ) as FloDownWasmBlock;

  const localSymbolUriMap = buildModuleLocalSymbolUriMap(
    input.definitionBlocks,
  );

  const moduleStatement = buildModuleDescriptionStatement(input);
  const previewBlocks = normalizeToRoot(moduleStatement).content as ModulePreviewBlock[];
  for (const block of previewBlocks) {
    await addModulePreviewBlock(
      fdVisible,
      block,
      {
        futureRepo: input.futureRepo,
        filePath: input.modulesFilePath,
        fileName: input.moduleId,
        language: input.language,
      },
      localSymbolUriMap,
    );
  }

  return fdVisible.getStex().trimEnd();
}

export async function generateModuleDescriptionDefinitionTex(
  moduleId: string,
  defBlock: DefinitionBlockInput,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;

  const visibleIdentity = exportIdentityFromGlox({
    futureRepo: defBlock.futureRepo,
    filePath: defBlock.filePath,
    fileName: defBlock.fileName,
    language: defBlock.language,
  });

  const { fdHidden, fdVisible } = await initFloDownBlocks(
    floDown,
    visibleIdentity,
    hiddenScratchDocumentUri(moduleId, defBlock.language),
  );

  const alive: FloDownWasmBlock[] = [
    fdHidden,
    fdVisible as FloDownWasmBlock,
  ];

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
        language: defBlock.language,
      },
      new Set(defBlock.declaredSymbols),
    );
  }

  return alive[1].getStex().trimEnd();
}

export async function generateModuleDescriptionTexPreview(
  input: GenerateModuleTexInput,
) {
  const moduleTex = await generateModuleDescriptionModuleTex(input);

  const moduleStatement = buildModuleDescriptionStatement(input);

  const definitionTex = await Promise.all(
    input.definitionBlocks.map(async (block) => ({
      fileName: `${block.fileName}.${block.language}.tex`,
      tex: await generateModuleDescriptionDefinitionTex(input.moduleId, block),
      ftmlStatement: block.statement,
      declaredSymbols: block.declaredSymbols,
    })),
  );

  return {
    moduleTex: {
      fileName: `${input.moduleId}.${input.language}.tex`,
      tex: moduleTex,
      ftmlStatement: moduleStatement,
    },
    definitionTex,
  };
}

/** @deprecated Use generateModuleDescriptionModuleTex */
export async function generateModuleDescriptionTex(
  input: GenerateModuleTexInput & { singleDefinitionOnly?: boolean },
): Promise<string> {
  if (input.singleDefinitionOnly && input.definitionBlocks.length === 1) {
    return generateModuleDescriptionDefinitionTex(
      input.moduleId,
      input.definitionBlocks[0],
    );
  }
  return generateModuleDescriptionModuleTex(input);
}
