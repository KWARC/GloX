import { describe, expect, it } from "vitest";
import {
  composeModuleTexInputForExport,
  type GenerateModuleTexInput,
} from "@/lib/moduleDescriptionTex";
import {
  assertModuleDescriptionsToExport,
  bulkTexExportButtonLabel,
  selectModuleDescriptionsForBulkTexExport,
} from "@/lib/moduleDescriptionTexExport";
import type { FloDownStatement } from "@/types/floDown.types";
import type { IndexStatus } from "@/types/indexStatus";

function paragraph(text: string): FloDownStatement {
  return { type: "paragraph", content: [text] };
}

type BulkRow = {
  moduleId: string;
  indexStatus: IndexStatus;
  isFavorite: boolean;
  duplicateOfModuleId: string | null;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
};

function row(overrides: Partial<BulkRow> & Pick<BulkRow, "moduleId" | "indexStatus">): BulkRow {
  return {
    isFavorite: false,
    duplicateOfModuleId: null,
    inhaltStatement: paragraph(`${overrides.moduleId} inhalt`),
    lernzieleStatement: paragraph(`${overrides.moduleId} lernziele`),
    ...overrides,
  };
}

const extractedFavorite = row({
  moduleId: "100",
  indexStatus: "EXTRACTED",
  isFavorite: true,
});
const finalizedFavorite = row({
  moduleId: "200",
  indexStatus: "FINALIZED",
  isFavorite: true,
  duplicateOfModuleId: "100",
  inhaltStatement: paragraph("alias inhalt should not appear"),
  lernzieleStatement: paragraph("alias lernziele should not appear"),
});
const finalizedOther = row({
  moduleId: "300",
  indexStatus: "FINALIZED",
  isFavorite: false,
});
const submitted = row({
  moduleId: "400",
  indexStatus: "SUBMITTED_TO_MATHHUB",
});

const allRows = [extractedFavorite, finalizedFavorite, finalizedOther, submitted];

describe("selectModuleDescriptionsForBulkTexExport (S-MOD-24)", () => {
  it("returns every row when status is null", () => {
    const selected = selectModuleDescriptionsForBulkTexExport(allRows, null);
    expect(selected.map((item) => item.moduleId)).toEqual(["100", "200", "300", "400"]);
  });

  it("returns only Finalized rows, including favorites and non-favorites", () => {
    const selected = selectModuleDescriptionsForBulkTexExport(allRows, "FINALIZED");
    expect(selected.map((item) => item.moduleId)).toEqual(["200", "300"]);
  });

  it("returns only Submitted rows", () => {
    const selected = selectModuleDescriptionsForBulkTexExport(
      allRows,
      "SUBMITTED_TO_MATHHUB",
    );
    expect(selected.map((item) => item.moduleId)).toEqual(["400"]);
  });

  it("keeps a Finalized duplicate and composes canonical Inhalt and Lernziele when the canonical is Extracted", () => {
    const selected = selectModuleDescriptionsForBulkTexExport(allRows, "FINALIZED");
    const duplicate = selected.find((item) => item.moduleId === "200");
    expect(duplicate).toBeDefined();
    expect(selected.map((item) => item.moduleId)).not.toContain("100");

    const input: GenerateModuleTexInput = {
      moduleId: duplicate!.moduleId,
      language: "de",
      titleStatement: paragraph("alias title"),
      inhaltStatement: duplicate!.inhaltStatement,
      lernzieleStatement: duplicate!.lernzieleStatement,
      futureRepo: "courses/FAU/module-descriptions",
      modulesFilePath: "modules",
      definitionBlocks: [],
      duplicateOfModuleId: duplicate!.duplicateOfModuleId,
    };
    const composed = composeModuleTexInputForExport(input, {
      inhaltStatement: extractedFavorite.inhaltStatement,
      lernzieleStatement: extractedFavorite.lernzieleStatement,
    });
    const serialized = JSON.stringify(composed);
    expect(serialized).toContain("100 inhalt");
    expect(serialized).toContain("100 lernziele");
    expect(serialized).not.toContain("alias inhalt should not appear");
  });
});

describe("assertModuleDescriptionsToExport (S-MOD-24)", () => {
  it("throws when the export set is empty and does not throw when it has rows", () => {
    expect(() => assertModuleDescriptionsToExport([])).toThrow(
      "No module descriptions to export",
    );
    expect(() => assertModuleDescriptionsToExport([finalizedOther])).not.toThrow();
  });
});

describe("bulkTexExportButtonLabel (S-MOD-32)", () => {
  it("names the status and does not include a count", () => {
    const labels = [
      bulkTexExportButtonLabel(null),
      bulkTexExportButtonLabel("EXTRACTED"),
      bulkTexExportButtonLabel("FINALIZED"),
      bulkTexExportButtonLabel("SUBMITTED_TO_MATHHUB"),
    ];
    expect(labels).toEqual([
      "Download all",
      "Download extracted",
      "Download finalized",
      "Download submitted",
    ]);
    for (const label of labels) {
      expect(label).not.toMatch(/\d/);
    }
  });
});
