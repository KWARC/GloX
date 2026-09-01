import { describe, expect, it } from "vitest";
import {
  normalizeModuleCatalogJson,
  normalizeOrganizations,
  normalizePrograms,
  type ModuleCatalogJson,
} from "./moduleCatalog";

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
