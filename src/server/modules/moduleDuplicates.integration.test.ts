import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { searchModules } from "./moduleCatalog";
import { resetModuleCatalogForTests } from "./moduleCatalog";
import { attachDuplicateHints } from "./moduleDuplicateHints";
import {
  loadCatalogDuplicatesIndex,
  resetDuplicateIndexForTests,
} from "./moduleDuplicateIndex";
import {
  assertExtractorPlusAuth,
  assertNotDuplicateDescription,
  DUPLICATE_SEMANTICS_ERROR,
  MARK_ALIAS_TARGET_ERROR,
  MARK_CANONICAL_MISSING_ERROR,
  planMarkDuplicate,
  planUnmarkDuplicate,
} from "./moduleDuplicateGuards";

const catalogSearchFixtureDir = path.join(
  import.meta.dirname,
  "__fixtures__",
  "catalog-search",
);

describe("searchModuleDescriptions duplicate hints (S-MOD-19)", () => {
  const previousModulesDir = process.env.MODULES_DIR;

  beforeEach(() => {
    process.env.MODULES_DIR = catalogSearchFixtureDir;
    resetModuleCatalogForTests();
    resetDuplicateIndexForTests();
  });

  afterEach(() => {
    if (previousModulesDir === undefined) {
      delete process.env.MODULES_DIR;
    } else {
      process.env.MODULES_DIR = previousModulesDir;
    }
    resetModuleCatalogForTests();
    resetDuplicateIndexForTests();
  });

  it("attaches exact peer 42438 for hit 62083 from the index file", async () => {
    const hits = await searchModules("62083");
    expect(hits.map((row) => row.moduleId)).toContain("62083");

    const index = await loadCatalogDuplicatesIndex();
    const enriched = attachDuplicateHints(hits, index, new Set(["42438"]));
    const hit = enriched.find((row) => row.moduleId === "62083");
    expect(hit?.duplicateHint?.exact.map((peer) => peer.moduleId)).toEqual([
      "42438",
    ]);
    expect(hit?.moduleId).toBe("62083");
  });
});

describe("mark duplicate policy (S-MOD-20, S-MOD-21, S-MOD-22, R-MOD-13)", () => {
  it("rejects mark when the canonical row is missing", () => {
    expect(() =>
      planMarkDuplicate({ sourceModuleId: "62083", target: null }),
    ).toThrow(MARK_CANONICAL_MISSING_ERROR);
  });

  it("rejects mark when the target is already a duplicate", () => {
    expect(() =>
      planMarkDuplicate({
        sourceModuleId: "62083",
        target: { moduleId: "42438", duplicateOfModuleId: "111" },
      }),
    ).toThrow(MARK_ALIAS_TARGET_ERROR);
  });

  it("plans definition delete, title keep, and empty Inhalt/Lernziele", () => {
    const plan = planMarkDuplicate({
      sourceModuleId: "62083",
      target: { moduleId: "42438", duplicateOfModuleId: null },
    });
    expect(plan).toEqual({
      duplicateOfModuleId: "42438",
      deleteDefinitionBlocks: true,
      keepTitleStatement: true,
      clearInhaltAndLernziele: true,
    });
  });

  it("fails statement and definition mutations WHILE duplicate (S-MOD-21)", () => {
    expect(() =>
      assertNotDuplicateDescription({ duplicateOfModuleId: "42438" }),
    ).toThrow(DUPLICATE_SEMANTICS_ERROR);
    expect(() =>
      assertNotDuplicateDescription({ duplicateOfModuleId: null }),
    ).not.toThrow();
  });

  it("unmark clears the FK and reseeds catalog fields (S-MOD-22)", () => {
    expect(planUnmarkDuplicate()).toEqual({
      duplicateOfModuleId: null,
      reseedTitleInhaltLernziele: true,
    });
  });

  it("rejects unauthenticated mark (R-MOD-13)", () => {
    expect(() => assertExtractorPlusAuth({ loggedIn: false })).toThrow(
      "Unauthorized",
    );
  });
});
