import { initFloDown } from "@/lib/flodownClient";
import { createFloDownDocumentFromGlox } from "@/lib/flodownUris";
import { mountStatementOnFloDown } from "@/lib/prepareFloDownStatement";
import {
  FloDownStatement,
  HeadingNode,
  isDefinitionNode,
  normalizeToRoot,
  PersistedBlock,
} from "@/types/floDown.types";

export type DefinitionBlockInput = {
  id: string;
  statement: FloDownStatement;
  declaredSymbols: readonly string[];
  declaredSymbolsInfo?: unknown;
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
  declaredSymbolsInfo?: unknown;
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

export async function generateModuleDescriptionModuleTex(
  input: GenerateModuleTexInput,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;

  const fd = createFloDownDocumentFromGlox(floDown.FloDown, {
    futureRepo: input.futureRepo,
    filePath: input.modulesFilePath,
    fileName: input.moduleId,
    language: input.language,
  }) as FloDownWasmBlock;

  const moduleStatement = buildModuleDescriptionStatement(input);

  mountStatementOnFloDown(fd, moduleStatement);

  return fd.getStex().trimEnd();
}

export async function generateModuleDescriptionDefinitionTex(
  _moduleId: string,
  defBlock: DefinitionBlockInput,
  _siblingBlocks: readonly DefinitionBlockInput[] = [],
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }

  const floDown = (await initFloDown()) as FloDownLib;

  const fd = createFloDownDocumentFromGlox(floDown.FloDown, {
    futureRepo: defBlock.futureRepo,
    filePath: defBlock.filePath,
    fileName: defBlock.fileName,
    language: defBlock.language,
  }) as FloDownWasmBlock;

  const root = normalizeToRoot(defBlock.statement);
  for (const block of root.content) {
    if (!isDefinitionNode(block)) continue;
    mountStatementOnFloDown(fd, block);
  }

  return fd.getStex().trimEnd();
}

export async function generateModuleDescriptionTexPreview(
  input: GenerateModuleTexInput,
) {
  const moduleTex = await generateModuleDescriptionModuleTex(input);

  const moduleStatement = buildModuleDescriptionStatement(input);

  const definitionTex = await Promise.all(
    input.definitionBlocks.map(async (block) => ({
      fileName: `${block.fileName}.${block.language}.tex`,
      tex: await generateModuleDescriptionDefinitionTex(
        input.moduleId,
        block,
        input.definitionBlocks,
      ),
      ftmlStatement: block.statement,
      declaredSymbols: block.declaredSymbols,
      declaredSymbolsInfo: block.declaredSymbolsInfo,
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
      input.definitionBlocks,
    );
  }
  return generateModuleDescriptionModuleTex(input);
}
