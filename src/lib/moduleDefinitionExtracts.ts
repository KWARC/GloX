import type { ExtractedItem } from "@/server/text-selection";
import type { FloDownStatement } from "@/types/floDown.types";

export type ModuleDefinitionBlock = {
  id: string;
  originalText: string;
  statement: FloDownStatement;
  declaredSymbols: string[];
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export function moduleDefinitionToExtractedItem(
  block: ModuleDefinitionBlock,
): ExtractedItem {
  return {
    id: block.id,
    documentId: "",
    documentPageId: "",
    pageNumber: null,
    originalText: block.originalText,
    statement: block.statement,
    declaredSymbols: block.declaredSymbols,
    futureRepo: block.futureRepo,
    filePath: block.filePath,
    fileName: block.fileName,
    language: block.language,
  };
}

export function moduleDefinitionsToExtractedItems(
  blocks: ModuleDefinitionBlock[],
): ExtractedItem[] {
  return blocks.map(moduleDefinitionToExtractedItem);
}
