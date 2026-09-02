// @ts-nocheck -- scripts/*.mjs has no TypeScript declarations
import { describe, expect, it } from "vitest";
import {
  buildDuplicatesIndex,
  classifyRecordsByElementnr,
  clusterDuplicates,
  clusterExactDuplicates,
  exactSignaturePayload,
  extractSignatureFields,
  isEmptySignature,
  nearSimilarity,
  normalizeForNear,
} from "./moduleDescriptionDuplicates.mjs";

describe("extractSignatureFields", () => {
  it("reads the three GloX fields and treats missing sections as empty", () => {
    expect(
      extractSignatureFields({
        title: "Lineare Algebra I",
        descriptionSections: {
          Inhalt: "Vektorräume",
          "Lernziele und Kompetenzen": "erkennen lineare Zusammenhänge",
        },
      }),
    ).toEqual({
      title: "Lineare Algebra I",
      inhalt: "Vektorräume",
      lernziele: "erkennen lineare Zusammenhänge",
    });

    expect(extractSignatureFields({})).toEqual({
      title: "",
      inhalt: "",
      lernziele: "",
    });
  });
});

describe("clusterDuplicates match parameter", () => {
  it("requires a known algorithm", () => {
    expect(() => clusterDuplicates([], { match: "fuzzy" })).toThrow(
      /Unknown match/,
    );
  });
});

describe("clusterExactDuplicates", () => {
  it("groups distinct moduleIds with identical title, Inhalt, and Lernziele", () => {
    const fields = {
      title: "Lineare Algebra I",
      inhalt: "Gruppen und Körper",
      lernziele: "Gauß-Algorithmus",
    };
    const clusters = clusterDuplicates(
      [
        { moduleId: "62083", fields },
        { moduleId: "42438", fields },
        {
          moduleId: "1",
          fields: { title: "Other", inhalt: "x", lernziele: "y" },
        },
      ],
      { match: "exact" },
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.size).toBe(2);
    expect(clusters[0]?.kind).toBe("exact");
    expect(clusters[0]?.members.map((m) => m.moduleId)).toEqual([
      "42438",
      "62083",
    ]);
  });

  it("does not group records that differ in any of the three fields", () => {
    const base = {
      title: "Lineare Algebra I",
      inhalt: "Gruppen",
      lernziele: "Gauß",
    };
    const clusters = clusterExactDuplicates([
      { moduleId: "a", fields: base },
      { moduleId: "b", fields: { ...base, inhalt: "Gruppen " } },
    ]);
    expect(clusters).toHaveLength(0);
  });

  it("skips all-empty signatures unless includeEmpty is set", () => {
    const empty = { title: "", inhalt: "", lernziele: "" };
    expect(isEmptySignature(empty)).toBe(true);
    expect(
      clusterExactDuplicates([
        { moduleId: "1", fields: empty },
        { moduleId: "2", fields: empty },
      ]),
    ).toHaveLength(0);
    expect(
      clusterExactDuplicates(
        [
          { moduleId: "1", fields: empty },
          { moduleId: "2", fields: empty },
        ],
        { includeEmpty: true },
      ),
    ).toHaveLength(1);
  });
});

describe("exactSignaturePayload", () => {
  it("preserves whitespace so near-duplicates stay distinct", () => {
    expect(
      exactSignaturePayload({
        title: "A",
        inhalt: "x",
        lernziele: "y",
      }),
    ).not.toBe(
      exactSignaturePayload({
        title: "A",
        inhalt: "x\n",
        lernziele: "y",
      }),
    );
  });
});

describe("clusterDuplicates match=near", () => {
  const longInhalt =
    "Gruppen und Koerper Vektorraeume Lineare Abbildungen Gleichungssysteme Basen Dimension";
  const longLernziele =
    "Die Studierenden erkennen lineare Zusammenhaenge und verwenden den Gauss Algorithmus";

  it("groups whitespace and umlaut variants that are not byte-identical", () => {
    const clusters = clusterDuplicates(
      [
        {
          moduleId: "1",
          fields: {
            title: "Lineare Algebra I",
            inhalt: "Gruppen und Körper\n",
            lernziele: longLernziele,
          },
        },
        {
          moduleId: "2",
          fields: {
            title: "lineare  algebra i",
            inhalt: "Gruppen und Koerper",
            lernziele: longLernziele,
          },
        },
      ],
      { match: "near" },
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.kind).toBe("normalized");
    expect(clusters[0]?.members.map((m) => m.moduleId)).toEqual(["1", "2"]);
  });

  it("groups high-Jaccard rewrites and skips unrelated text", () => {
    const clusters = clusterDuplicates(
      [
        {
          moduleId: "10",
          fields: {
            title: "Lineare Algebra I",
            inhalt: `${longInhalt} Determinante`,
            lernziele: longLernziele,
          },
        },
        {
          moduleId: "11",
          fields: {
            title: "Lineare Algebra I",
            inhalt: `${longInhalt} Determinanten`,
            lernziele: longLernziele,
          },
        },
        {
          moduleId: "99",
          fields: {
            title: "Biochemie",
            inhalt: "Stoffwechsel Enzyme Proteine Lipide",
            lernziele: "Die Studierenden erklaeren Stoffwechselwege",
          },
        },
      ],
      { match: "near", threshold: 0.9 },
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.kind).toBe("similar");
    expect(clusters[0]?.members.map((m) => m.moduleId)).toEqual(["10", "11"]);
    expect(clusters[0]?.minScore).toBeGreaterThanOrEqual(0.9);
  });

  it("does not report byte-identical pairs (those belong to exact)", () => {
    const fields = {
      title: "Same",
      inhalt: longInhalt,
      lernziele: longLernziele,
    };
    expect(
      clusterDuplicates(
        [
          { moduleId: "a", fields },
          { moduleId: "b", fields },
        ],
        { match: "near" },
      ),
    ).toHaveLength(0);
  });

  it("folds German umlauts in normalization", () => {
    expect(normalizeForNear("Gauß-Körper")).toBe("gauss koerper");
  });

  it("scores identical fields as 1", () => {
    const fields = {
      title: "T",
      inhalt: "alpha beta",
      lernziele: "gamma delta",
    };
    expect(nearSimilarity(fields, fields)).toBe(1);
  });
});

describe("buildDuplicatesIndex", () => {
  it("emits a module-keyed envelope with A↔B exact symmetry and sorted peers", () => {
    const fields = {
      title: "Lineare Algebra I",
      inhalt: "Gruppen",
      lernziele: "Gauß",
    };
    const exactClusters = [
      {
        title: "Lineare Algebra I",
        members: [
          { moduleId: "62083", fields },
          { moduleId: "42438", fields },
        ],
      },
    ];

    const index = buildDuplicatesIndex({
      exactClusters,
      nearClusters: [],
      generatedAt: "2026-09-02T00:00:00.000Z",
      nearThreshold: 0.9,
    });

    expect(index.version).toBe(1);
    expect(index.modules["1"]).toBeUndefined();
    expect(index.modules["42438"]?.exact).toEqual([
      { moduleId: "62083", title: "Lineare Algebra I" },
    ]);
    expect(index.modules["62083"]?.exact).toEqual([
      { moduleId: "42438", title: "Lineare Algebra I" },
    ]);
    expect(index.modules["62083"]?.near).toBeUndefined();
  });

  it("keeps a pair in exact only when it also appears in a near cluster", () => {
    const fields = { title: "Same", inhalt: "a", lernziele: "b" };
    const members = [
      { moduleId: "10", fields },
      { moduleId: "11", fields },
    ];
    const index = buildDuplicatesIndex({
      exactClusters: [{ title: "Same", members }],
      nearClusters: [
        {
          title: "Same",
          kind: "similar",
          minScore: 0.95,
          members,
        },
      ],
      generatedAt: "2026-09-02T00:00:00.000Z",
    });

    expect(index.modules["10"]?.exact?.map((p: { moduleId: string }) => p.moduleId)).toEqual(["11"]);
    expect(index.modules["10"]?.near).toBeUndefined();
  });

  it("omits module ids that have no peers", () => {
    const index = buildDuplicatesIndex({
      exactClusters: [
        {
          title: "Solo",
          members: [{ moduleId: "1", fields: { title: "Solo" } }],
        },
      ],
      nearClusters: [],
      generatedAt: "2026-09-02T00:00:00.000Z",
    });
    expect(index.modules).toEqual({});
  });
});

describe("classifyRecordsByElementnr", () => {
  const inhalt =
    "Gruppen und Koerper Vektorraeume Lineare Abbildungen Gleichungssysteme";
  const lernziele =
    "Die Studierenden erkennen lineare Zusammenhaenge und verwenden Gauss";

  it("marks shared elementnr as exact when the three fields match", () => {
    const fields = { title: "LA I", inhalt, lernziele };
    const { groups, missingElementnr } = classifyRecordsByElementnr([
      { moduleId: "42438", elementnr: "65011", fields },
      { moduleId: "62083", elementnr: "65011", fields },
    ]);
    expect(missingElementnr).toHaveLength(0);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.verdict).toBe("exact");
    expect(groups[0]?.moduleCount).toBe(2);
  });

  it("marks whitespace/umlaut variants as near, not exact", () => {
    const { groups } = classifyRecordsByElementnr([
      {
        moduleId: "1",
        elementnr: "1",
        fields: { title: "LA I", inhalt: `${inhalt}\n`, lernziele },
      },
      {
        moduleId: "2",
        elementnr: "1",
        fields: { title: "la i", inhalt, lernziele },
      },
    ]);
    expect(groups[0]?.verdict).toBe("near");
    expect(groups[0]?.nearKind).toBe("normalized");
  });

  it("marks unrelated texts under one elementnr as divergent", () => {
    const { groups } = classifyRecordsByElementnr(
      [
        {
          moduleId: "1",
          elementnr: "9",
          fields: { title: "LA I", inhalt, lernziele },
        },
        {
          moduleId: "2",
          elementnr: "9",
          fields: {
            title: "Biochemie",
            inhalt: "Stoffwechsel Enzyme Proteine Lipide Kohlenhydrate",
            lernziele: "Die Studierenden erklaeren Stoffwechselwege der Zelle",
          },
        },
      ],
      { threshold: 0.9 },
    );
    expect(groups[0]?.verdict).toBe("divergent");
    expect(groups[0]?.exactSignatureCount).toBe(2);
  });

  it("counts modules without elementnr separately", () => {
    const { groups, missingElementnr } = classifyRecordsByElementnr([
      {
        moduleId: "1",
        elementnr: null,
        fields: { title: "X", inhalt: "a", lernziele: "b" },
      },
    ]);
    expect(groups).toHaveLength(0);
    expect(missingElementnr.map((r) => r.moduleId)).toEqual(["1"]);
  });
});
