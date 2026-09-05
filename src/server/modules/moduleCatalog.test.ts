import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getModuleSearchEntry,
  normalizeModuleCatalogJson,
  normalizeOrganizations,
  normalizePrograms,
  resetModuleCatalogForTests,
  searchModules,
  type ModuleCatalogJson,
} from "./moduleCatalog";

const catalogSearchFixtureDir = path.join(
  import.meta.dirname,
  "__fixtures__",
  "catalog-search",
);

describe("normalizeOrganizations", () => {
  it("drops null entries used by unclassified catalog modules", () => {
    expect(normalizeOrganizations([null])).toEqual([]);
  });

  it("keeps rows that have faculty or subject area", () => {
    expect(
      normalizeOrganizations([
        { faculty: "Medizinische Fakultät", subjectArea: "Logopädie" },
        { faculty: "Phil", subjectArea: null },
      ]),
    ).toEqual([
      { faculty: "Medizinische Fakultät", subjectArea: "Logopädie" },
      { faculty: "Phil", subjectArea: null },
    ]);
  });
});

describe("normalizePrograms", () => {
  it("drops null entries and rows without a root unit", () => {
    expect(
      normalizePrograms([
        null,
        { ancestorChain: ["Staatsexamen"] },
        { rootUnitId: "5572", ancestorChain: ["Staatsexamen", "Gesamtkonto"] },
      ]),
    ).toEqual([
      {
        rootUnitId: "5572",
        ancestorChain: ["Staatsexamen", "Gesamtkonto"],
        category: undefined,
      },
    ]);
  });
});

describe("normalizeModuleCatalogJson", () => {
  it("normalizes sparse 58903-style catalog JSON", () => {
    const json = {
      moduleId: "58903",
      title: "Wissenschaftliches Arbeiten",
      descriptionSections: { Inhalt: "text" },
      organizations: [null],
      programs: [{ rootUnitId: "5572" }],
    } as unknown as ModuleCatalogJson;

    expect(normalizeModuleCatalogJson(json).organizations).toEqual([]);
    expect(normalizeModuleCatalogJson(json).programs).toEqual([
      { rootUnitId: "5572", ancestorChain: undefined, category: undefined },
    ]);
  });
});

describe("searchModules hierarchy faculty and subject area", () => {
  const previousModulesDir = process.env.MODULES_DIR;

  beforeEach(() => {
    process.env.MODULES_DIR = catalogSearchFixtureDir;
    resetModuleCatalogForTests();
  });

  afterEach(() => {
    if (previousModulesDir === undefined) {
      delete process.env.MODULES_DIR;
    } else {
      process.env.MODULES_DIR = previousModulesDir;
    }
    resetModuleCatalogForTests();
  });

  it("returns faculty and subjectArea from hierarchy.json (S-MOD-16)", async () => {
    const results = await searchModules("Gamma");
    expect(results).toEqual([
      {
        moduleId: "m3",
        title: "Gamma Course",
        faculty: "Medizinische Fakultät",
        subjectArea: "Logopädie",
      },
    ]);
  });

  it("uses null when hierarchy omits org fields and does not invent Unclassified (S-MOD-18)", async () => {
    const results = await searchModules("Delta");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      moduleId: "m4",
      title: "Delta Course",
      faculty: null,
      subjectArea: null,
    });
    expect(JSON.stringify(results[0])).not.toMatch(/Unclassified/i);
  });

  it("orders by faculty, then subjectArea, then title, then moduleId (S-MOD-17)", async () => {
    const results = await searchModules("Course");
    expect(results.map((row) => row.moduleId)).toEqual([
      "m4",
      "m3",
      "m1",
      "m5",
      "m2",
    ]);
  });

  it("treats absent org as empty for sort without a German locale (S-MOD-17)", async () => {
    const results = await searchModules("Course");
    const first = results[0];
    expect(first?.moduleId).toBe("m4");
    expect(first?.faculty).toBeNull();
    expect(first?.subjectArea).toBeNull();
  });
});

describe("getModuleSearchEntry hierarchy faculty and subject area", () => {
  const previousModulesDir = process.env.MODULES_DIR;

  beforeEach(() => {
    process.env.MODULES_DIR = catalogSearchFixtureDir;
    resetModuleCatalogForTests();
  });

  afterEach(() => {
    if (previousModulesDir === undefined) {
      delete process.env.MODULES_DIR;
    } else {
      process.env.MODULES_DIR = previousModulesDir;
    }
    resetModuleCatalogForTests();
  });

  it("returns hierarchy faculty and subjectArea (S-MOD-25)", async () => {
    const entry = await getModuleSearchEntry("m3");
    expect(entry).toMatchObject({
      moduleId: "m3",
      title: "Gamma Course",
      faculty: "Medizinische Fakultät",
      subjectArea: "Logopädie",
    });
  });

  it("uses null when hierarchy omits org fields and does not invent Unclassified (S-MOD-18)", async () => {
    const entry = await getModuleSearchEntry("m4");
    expect(entry).toMatchObject({
      moduleId: "m4",
      faculty: null,
      subjectArea: null,
    });
    expect(JSON.stringify(entry)).not.toMatch(/Unclassified/i);
  });

  it("prefers hierarchy org over per-module JSON organizations (S-MOD-18)", async () => {
    const entry = await getModuleSearchEntry("m3-json");
    expect(entry).toMatchObject({
      moduleId: "m3-json",
      title: "Org source fixture JSON title",
      faculty: "Medizinische Fakultät",
      subjectArea: "Logopädie",
    });
    expect(entry?.faculty).not.toBe("JSON Faculty");
  });
});
