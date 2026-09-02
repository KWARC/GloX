import { describe, expect, it } from "vitest";
import {
  buildModuleDescriptionStatement,
  composeModuleTexInputForExport,
  plannedTexZipFileNames,
  type GenerateModuleTexInput,
} from "./moduleDescriptionTex";
import type { FloDownStatement } from "@/types/floDown.types";

function paragraph(text: string): FloDownStatement {
  return { type: "paragraph", content: [text] };
}

function baseInput(
  overrides: Partial<GenerateModuleTexInput> = {},
): GenerateModuleTexInput {
  return {
    moduleId: "62083",
    language: "de",
    titleStatement: paragraph("Technomathematik title"),
    inhaltStatement: paragraph("alias inhalt should not appear"),
    lernzieleStatement: paragraph("alias lernziele should not appear"),
    futureRepo: "courses/FAU/module-descriptions",
    modulesFilePath: "modules",
    definitionBlocks: [
      {
        id: "def-alias",
        statement: paragraph("alias def"),
        declaredSymbols: [],
        futureRepo: "courses/FAU/module-descriptions",
        filePath: "defs",
        fileName: "alias-def",
        language: "de",
      },
    ],
    ...overrides,
  };
}

describe("composeModuleTexInputForExport (S-MOD-23)", () => {
  it("uses the alias catalog title and canonical Inhalt/Lernziele", () => {
    const composed = composeModuleTexInputForExport(
      baseInput({ duplicateOfModuleId: "42438" }),
      {
        inhaltStatement: paragraph("canonical inhalt"),
        lernzieleStatement: paragraph("canonical lernziele"),
      },
    );

    const statement = buildModuleDescriptionStatement(composed);
    const serialized = JSON.stringify(statement);
    expect(serialized).toContain("Technomathematik title");
    expect(serialized).toContain("canonical inhalt");
    expect(serialized).toContain("canonical lernziele");
    expect(serialized).not.toContain("alias inhalt should not appear");
    expect(composed.definitionBlocks).toEqual([]);
  });
});

describe("bulk export file list (S-MOD-24)", () => {
  it("includes alias and canonical module TeX and omits alias definition files", () => {
    const alias = composeModuleTexInputForExport(
      baseInput({ duplicateOfModuleId: "42438" }),
      {
        inhaltStatement: paragraph("canonical inhalt"),
        lernzieleStatement: paragraph("canonical lernziele"),
      },
    );
    const canonical = baseInput({
      moduleId: "42438",
      duplicateOfModuleId: null,
      titleStatement: paragraph("Mathematik title"),
      inhaltStatement: paragraph("canonical inhalt"),
      lernzieleStatement: paragraph("canonical lernziele"),
      definitionBlocks: [
        {
          id: "def-can",
          statement: paragraph("canonical def"),
          declaredSymbols: [],
          futureRepo: "courses/FAU/module-descriptions",
          filePath: "defs",
          fileName: "vector-space",
          language: "de",
        },
      ],
    });

    expect(plannedTexZipFileNames([alias, canonical])).toEqual([
      "62083.de.tex",
      "42438.de.tex",
      "vector-space.de.tex",
    ]);
  });
});
