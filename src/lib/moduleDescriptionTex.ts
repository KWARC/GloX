import { initFloDown } from "@/lib/flodownClient";
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
  addSymbolDeclaration: (name: string) => string;
  getStex(): string;
  clear: () => void;
};

type FloDownLib = {
  FloDown: { fromUri: (uri: string) => FloDownWasmBlock };
};

function sectionHeading(title: string): HeadingNode {
  return {
    type: "heading",
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

async function addModulePreviewBlock(
  fdVisible: FloDownWasmBlock,
  block: ModulePreviewBlock,
  identity: { futureRepo: string; filePath: string; fileName: string },
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
    ) as PersistedBlock,
  );
}

async function initFloDownBlocks(
  floDown: FloDownLib,
  visibleUri: string,
  hiddenUri: string,
): Promise<{ fdHidden: FloDownWasmBlock; fdVisible: FloDownWasmBlock }> {
  const fdHidden = floDown.FloDown.fromUri(hiddenUri);
  const fdVisible = floDown.FloDown.fromUri(visibleUri);
  return { fdHidden, fdVisible };
}

export async function generateModuleDescriptionModuleTex(
  input: GenerateModuleTexInput,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;

  const fdVisible = floDown.FloDown.fromUri(
    buildDocumentUri(
      input.futureRepo,
      input.modulesFilePath,
      input.moduleId,
      input.language,
    ),
  );

  const moduleIdentity = {
    futureRepo: input.futureRepo,
    filePath: input.modulesFilePath,
    fileName: input.moduleId,
  };

  const localSymbolUriMap = buildModuleLocalSymbolUriMap(
    input.definitionBlocks,
  );

  const moduleStatement = buildModuleDescriptionStatement(input);
  const previewBlocks = normalizeToRoot(moduleStatement).content as ModulePreviewBlock[];
  for (const block of previewBlocks) {
    await addModulePreviewBlock(
      fdVisible,
      block,
      moduleIdentity,
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

  const { fdHidden, fdVisible } = await initFloDownBlocks(
    floDown,
    buildDocumentUri(
      defBlock.futureRepo,
      defBlock.filePath,
      defBlock.fileName,
      defBlock.language,
    ),
    buildDocumentUri("hidden", "temp", moduleId, defBlock.language),
  );

  const alive: FloDownWasmBlock[] = [fdHidden, fdVisible];

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
