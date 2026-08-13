import { collectDefiniendumUris, extractPlainText } from "@/server/ftml/statementContent";
import type { ExtractedItem } from "@/server/text-selection";
import type { FloDownStatement } from "@/types/floDown.types";

export type ModuleStatementField =
  | "titleStatement"
  | "inhaltStatement"
  | "lernzieleStatement";

export const MODULE_STATEMENT_FIELDS: ModuleStatementField[] = [
  "titleStatement",
  "inhaltStatement",
  "lernzieleStatement",
];

export type ModuleStatementExportIdentity = {
  futureRepo: string;
  modulesFilePath: string;
  language: string;
};

const FIELD_SUFFIX_PATTERN =
  /:(titleStatement|inhaltStatement|lernzieleStatement)$/;

export function moduleStatementExtractId(
  moduleDescriptionId: string,
  field: ModuleStatementField,
): string {
  return `${moduleDescriptionId}:${field}`;
}

export function parseModuleStatementExtractId(extractId: string): {
  moduleDescriptionId: string;
  field: ModuleStatementField;
} | null {
  const match = extractId.match(FIELD_SUFFIX_PATTERN);
  if (!match) return null;

  const field = match[1] as ModuleStatementField;
  const moduleDescriptionId = extractId.slice(0, -(field.length + 1));
  if (!moduleDescriptionId) return null;

  return { moduleDescriptionId, field };
}

export function moduleStatementToExtractedItem({
  moduleDescriptionId,
  moduleId,
  field,
  statement,
  exportIdentity,
}: {
  moduleDescriptionId: string;
  moduleId: string;
  field: ModuleStatementField;
  statement: FloDownStatement;
  exportIdentity: ModuleStatementExportIdentity;
}): ExtractedItem {
  return {
    id: moduleStatementExtractId(moduleDescriptionId, field),
    documentId: "",
    documentPageId: "",
    pageNumber: null,
    originalText: extractPlainText(statement),
    statement,
    futureRepo: exportIdentity.futureRepo,
    filePath: exportIdentity.modulesFilePath,
    fileName: moduleId,
    language: exportIdentity.language,
  };
}

export type ModuleDefinitionSymbolSource = {
  declaredSymbols: readonly string[];
  statement: FloDownStatement;
};

/** Symbols from module definition blocks that statement symrefs may reference. */
export function collectModuleRegisteredSymbols(
  definitionBlocks: readonly ModuleDefinitionSymbolSource[],
): string[] {
  const symbols = new Set<string>();

  for (const block of definitionBlocks) {
    for (const symbol of block.declaredSymbols) {
      if (symbol.trim()) symbols.add(symbol.trim());
    }

    for (const uri of collectDefiniendumUris(block.statement)) {
      if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
        symbols.add(uri);
      }
    }
  }

  return [...symbols];
}

export function moduleStatementsToExtractedItems({
  moduleDescriptionId,
  moduleId,
  titleStatement,
  inhaltStatement,
  lernzieleStatement,
  exportIdentity,
}: {
  moduleDescriptionId: string;
  moduleId: string;
  titleStatement: FloDownStatement;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
  exportIdentity: ModuleStatementExportIdentity;
}): ExtractedItem[] {
  const statements: Record<ModuleStatementField, FloDownStatement> = {
    titleStatement,
    inhaltStatement,
    lernzieleStatement,
  };

  return MODULE_STATEMENT_FIELDS.map((field) =>
    moduleStatementToExtractedItem({
      moduleDescriptionId,
      moduleId,
      field,
      statement: statements[field],
      exportIdentity,
    }),
  );
}
