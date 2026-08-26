import type { GloxBlockIdentity } from "@/lib/gloxFileIdentity";
import { initFloDown } from "@/lib/flodownClient";
import {
  createFloDownDocumentFromGlox,
  documentUriFromGlox,
} from "@/lib/flodownUris";
import type { TexZipFile } from "@/lib/texZipExport";
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

export type TexFilePreview = TexZipFile & {
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

function texFileName(name: string, language: string): string {
  return `${name}.${language}.tex`;
}

function documentUriFor(identity: GloxBlockIdentity): string {
  return documentUriFromGlox(identity);
}

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

async function requireFloDownLib(): Promise<FloDownLib> {
  if (typeof window === "undefined") {
    throw new Error("FloDown LaTeX export must run in the browser");
  }
  return (await initFloDown()) as FloDownLib;
}

export async function generateModuleDescriptionModuleTex(
  input: GenerateModuleTexInput,
): Promise<string> {
  const floDown = await requireFloDownLib();
  const fd = createFloDownDocumentFromGlox(floDown.FloDown, {
    futureRepo: input.futureRepo,
    filePath: input.modulesFilePath,
    fileName: input.moduleId,
    language: input.language,
  }) as FloDownWasmBlock;

  mountStatementOnFloDown(fd, buildModuleDescriptionStatement(input));
  return fd.getStex().trimEnd();
}

export async function generateModuleDescriptionDefinitionTex(
  _moduleId: string,
  defBlock: DefinitionBlockInput,
  _siblingBlocks: readonly DefinitionBlockInput[] = [],
): Promise<string> {
  const floDown = await requireFloDownLib();
  const fd = createFloDownDocumentFromGlox(floDown.FloDown, defBlock) as FloDownWasmBlock;

  const root = normalizeToRoot(defBlock.statement);
  for (const block of root.content) {
    if (!isDefinitionNode(block)) continue;
    mountStatementOnFloDown(fd, block);
  }

  return fd.getStex().trimEnd();
}

export function buildModuleTexPreview(
  input: GenerateModuleTexInput,
  tex: string,
  ftmlStatement: FloDownStatement,
): TexFilePreview {
  return {
    fileName: texFileName(input.moduleId, input.language),
    tex,
    ftmlStatement,
    uri: documentUriFor({
      futureRepo: input.futureRepo,
      filePath: input.modulesFilePath,
      fileName: input.moduleId,
      language: input.language,
    }),
  };
}

export async function buildDefinitionTexPreview(
  moduleId: string,
  block: DefinitionBlockInput,
  siblings: readonly DefinitionBlockInput[],
): Promise<TexFilePreview> {
  return {
    fileName: texFileName(block.fileName, block.language),
    tex: await generateModuleDescriptionDefinitionTex(moduleId, block, siblings),
    ftmlStatement: block.statement,
    declaredSymbols: block.declaredSymbols,
    declaredSymbolsInfo: block.declaredSymbolsInfo,
    uri: documentUriFor(block),
  };
}

export async function generateModuleDescriptionTexPreview(
  input: GenerateModuleTexInput,
) {
  const moduleStatement = buildModuleDescriptionStatement(input);
  const moduleTex = buildModuleTexPreview(
    input,
    await generateModuleDescriptionModuleTex(input),
    moduleStatement,
  );
  const definitionTex = await Promise.all(
    input.definitionBlocks.map((block) =>
      buildDefinitionTexPreview(input.moduleId, block, input.definitionBlocks),
    ),
  );

  return { moduleTex, definitionTex };
}

export type ModuleDescriptionTexPreview = Awaited<
  ReturnType<typeof generateModuleDescriptionTexPreview>
>;

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
