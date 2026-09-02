import { describe, expect, it } from "vitest";
import {
  eligibleMarkTargetIds,
  formatDuplicateCountLabel,
  listedDuplicatePeers,
  pickMarkCanonicalId,
} from "@/lib/moduleDuplicateHintDisplay";
import {
  attachDuplicateHints,
  pickC2Suggestion,
} from "./moduleDuplicateHints";

describe("pickC2Suggestion (S-MOD-19)", () => {
  const exact = [
    { moduleId: "62083", title: "Lineare Algebra I" },
    { moduleId: "42438", title: "Lineare Algebra I" },
  ];
  const near = [
    { moduleId: "69341", title: "LA near", score: 0.94, nearKind: "similar" as const },
  ];

  it("prefers an extracted exact peer with the lowest numeric id", () => {
    expect(
      pickC2Suggestion(exact, near, new Set(["62083", "42438"])),
    ).toEqual({
      moduleId: "42438",
      title: "Lineare Algebra I",
      match: "exact",
      extracted: true,
    });
  });

  it("falls back to an extracted near peer when no exact peer is extracted", () => {
    expect(pickC2Suggestion(exact, near, new Set(["69341"]))).toEqual({
      moduleId: "69341",
      title: "LA near",
      match: "near",
      extracted: true,
    });
  });

  it("falls back to the lowest exact id when nobody is extracted", () => {
    expect(pickC2Suggestion(exact, near, new Set())).toEqual({
      moduleId: "42438",
      title: "Lineare Algebra I",
      match: "exact",
      extracted: false,
    });
  });
});

describe("duplicate hint listing", () => {
  it("summarizes exact and near counts without titles", () => {
    expect(formatDuplicateCountLabel(5, 3)).toBe("Duplicates: 5 exact, 3 near");
    expect(formatDuplicateCountLabel(5, 0)).toBe("Duplicates: 5 exact");
    expect(formatDuplicateCountLabel(0, 2)).toBe("Duplicates: 2 near");
  });

  it("lists extracted ids first, then unextracted, without hiding the hit", () => {
    const listed = listedDuplicatePeers(
      [
        { moduleId: "11111" },
        { moduleId: "54743" },
      ],
      [{ moduleId: "69341" }],
      new Set(["54743"]),
    );
    expect(listed.map((peer) => peer.moduleId)).toEqual([
      "54743",
      "11111",
      "69341",
    ]);
    expect(listed[0]?.extracted).toBe(true);
  });

  it("keeps duplicateOfModuleId so aliases can show the duplicate icon", () => {
    const listed = listedDuplicatePeers(
      [{ moduleId: "62083", duplicateOfModuleId: "42438" }],
      [],
      new Set(["62083"]),
    );
    expect(listed[0]).toMatchObject({
      moduleId: "62083",
      extracted: true,
      duplicateOfModuleId: "42438",
    });
  });

  it("offers only persisted non-duplicate peers as mark originals (S-MOD-20)", () => {
    const eligible = eligibleMarkTargetIds(
      [
        { moduleId: "11111", extracted: false, duplicateOfModuleId: null },
        { moduleId: "42438", extracted: true, duplicateOfModuleId: null },
        { moduleId: "62083", extracted: true, duplicateOfModuleId: "42438" },
      ],
      [
        { moduleId: "69341", extracted: true, duplicateOfModuleId: null },
        { moduleId: "70000", extracted: false, duplicateOfModuleId: null },
      ],
    );
    expect(eligible).toEqual({
      exact: ["42438"],
      near: ["69341"],
    });
    expect(pickMarkCanonicalId(eligible.exact, eligible.near)).toBe("42438");
    expect(pickMarkCanonicalId([], ["69341"])).toBe("69341");
    expect(pickMarkCanonicalId([], [])).toBeNull();
  });
});

describe("attachDuplicateHints", () => {
  it("keeps the queried moduleId on the hit (U1)", () => {
    const hits = attachDuplicateHints(
      [{ moduleId: "62083", title: "Lineare Algebra I" }],
      {
        version: 1,
        modules: {
          "62083": {
            exact: [{ moduleId: "42438", title: "Lineare Algebra I" }],
          },
        },
      },
      new Set(["42438"]),
    );
    expect(hits[0]?.moduleId).toBe("62083");
    expect(hits[0]?.duplicateHint?.suggestion?.moduleId).toBe("42438");
  });

  it("marks an extracted alias peer with duplicateOfModuleId", () => {
    const hits = attachDuplicateHints(
      [{ moduleId: "42438", title: "Lineare Algebra I" }],
      {
        version: 1,
        modules: {
          "42438": {
            exact: [{ moduleId: "62083", title: "Lineare Algebra I" }],
          },
        },
      },
      new Set(["62083"]),
      new Map([["62083", "42438"]]),
    );
    expect(hits[0]?.duplicateHint?.exact[0]).toMatchObject({
      moduleId: "62083",
      extracted: true,
      duplicateOfModuleId: "42438",
    });
  });
});
