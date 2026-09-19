import { describe, expect, it } from "vitest";
import {
  collectLocalSymbolUriHits,
  parseReplaceLocalSymbolWithMathHubInput,
  resolveDefiningBlockDeleteIds,
  retargetLocalSymbolSnapshot,
  roleMayReplaceLocalSymbolWithMathHub,
  type RetargetSnapshot,
} from "./replaceLocalSymbolWithMathHub";
import { declaredUrisFromJson } from "@/server/declaredSymbolsInfo";
import { astReferencesUri } from "./retargetUriInAst";
import type { FloDownStatement } from "@/types/floDown.types";

const LOCAL = "http://mathhub.info/?a=glox/local&p=mod&d=triangle&s=triangle";
const MATHHUB =
  "http://mathhub.info/?a=smglom/geometry&p=mod&d=triangle&s=triangle";

function definitionStatement(...inlines: (string | object)[]): FloDownStatement {
  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: inlines,
      },
    ],
  } as FloDownStatement;
}

const declaringStatement = definitionStatement(
  { type: "definiendum", uri: LOCAL, content: ["triangle"] },
  " is ",
  { type: "symref", uri: LOCAL, content: ["triangle"] },
);

const discardedStatement = definitionStatement({
  type: "symref",
  uri: LOCAL,
  content: ["triangle"],
});

const historicOnlyLocal = definitionStatement({
  type: "symref",
  uri: LOCAL,
  content: ["old"],
});

const paragraphWithRef = {
  type: "paragraph",
  content: [{ type: "symref", uri: LOCAL, content: ["T"] }],
} as FloDownStatement;

const emptyParagraph = {
  type: "paragraph",
  content: ["plain"],
} as FloDownStatement;

function snapshot(): RetargetSnapshot {
  return {
    floDown: [
      {
        id: "declaring",
        status: "EXTRACTED",
        statement: declaringStatement,
        declaredSymbolsInfo: [
          {
            symbolName: "triangle",
            symbolUri: LOCAL,
            hasConfirmed: false,
            confirmedById: null,
            confirmedBy: null,
          },
        ],
        historicStatements: [historicOnlyLocal],
      },
      {
        id: "discarded",
        status: "DISCARDED",
        statement: discardedStatement,
        declaredSymbolsInfo: [],
        historicStatements: [],
      },
    ],
    modules: [
      {
        id: "mod-row",
        moduleId: "42438",
        titleStatement: paragraphWithRef,
        inhaltStatement: paragraphWithRef,
        lernzieleStatement: emptyParagraph,
      },
    ],
  };
}

describe("collectLocalSymbolUriHits (S-SYM-14 / R-SYM-21)", () => {
  it("lists the declaring block, discarded blocks, and module Title/Inhalt/Lernziele hits", () => {
    const hits = collectLocalSymbolUriHits(snapshot(), LOCAL);
    expect(hits).toEqual(
      expect.arrayContaining([
        { kind: "floDown", id: "declaring", status: "EXTRACTED" },
        { kind: "floDown", id: "discarded", status: "DISCARDED" },
        { kind: "moduleStatement", moduleId: "42438", field: "title" },
        { kind: "moduleStatement", moduleId: "42438", field: "inhalt" },
      ]),
    );
    expect(hits).not.toContainEqual(
      expect.objectContaining({
        kind: "moduleStatement",
        field: "lernziele",
      }),
    );
  });
});

describe("retargetLocalSymbolSnapshot (S-SYM-03 / R-SYM-03 / R-SYM-20)", () => {
  it("rewrites current definienda and same-block symrefs, including discarded, and module JSON", () => {
    const next = retargetLocalSymbolSnapshot(snapshot(), LOCAL, MATHHUB);

    const declaring = next.floDown.find((row) => row.id === "declaring");
    const discarded = next.floDown.find((row) => row.id === "discarded");
    expect(declaring).toBeDefined();
    expect(discarded).toBeDefined();
    expect(astReferencesUri(declaring!.statement, LOCAL)).toBe(false);
    expect(astReferencesUri(declaring!.statement, MATHHUB)).toBe(true);
    expect(astReferencesUri(discarded!.statement, MATHHUB)).toBe(true);
    expect(discarded!.status).toBe("DISCARDED");

    expect(astReferencesUri(next.modules[0].titleStatement, MATHHUB)).toBe(true);
    expect(astReferencesUri(next.modules[0].inhaltStatement, MATHHUB)).toBe(
      true,
    );
    expect(astReferencesUri(next.modules[0].lernzieleStatement, LOCAL)).toBe(
      false,
    );
    expect(
      astReferencesUri(next.floDown[0].historicStatements[0], LOCAL),
    ).toBe(true);
  });

  it("drops the local declaration and keeps FloDown and module rows", () => {
    const next = retargetLocalSymbolSnapshot(snapshot(), LOCAL, MATHHUB);
    expect(next.floDown).toHaveLength(2);
    expect(next.modules).toHaveLength(1);
    expect(
      declaredUrisFromJson(next.floDown[0].declaredSymbolsInfo),
    ).not.toContain(LOCAL);
  });

});

describe("parseReplaceLocalSymbolWithMathHubInput (S-SYM-03 MUST NOT ID list)", () => {
  it("keeps localSymbolUri, mathHubUri, and definingBlockAction", () => {
    expect(
      parseReplaceLocalSymbolWithMathHubInput({
        localSymbolUri: LOCAL,
        mathHubUri: MATHHUB,
        definingBlockAction: "keep",
        selectedFloDownBlockIds: ["declaring"],
        primaryFloDownBlockId: "declaring",
      }),
    ).toEqual({
      localSymbolUri: LOCAL,
      mathHubUri: MATHHUB,
      definingBlockAction: "keep",
    });
  });

  it("rejects missing definingBlockAction", () => {
    expect(() =>
      parseReplaceLocalSymbolWithMathHubInput({
        localSymbolUri: LOCAL,
        mathHubUri: MATHHUB,
      }),
    ).toThrow(/definingBlockAction must be keep or delete/);
  });
});

describe("resolveDefiningBlockDeleteIds (S-SYM-03 / R-SYM-20 / R-SYM-23)", () => {
  it("returns no ids for keep", () => {
    expect(
      resolveDefiningBlockDeleteIds(snapshot(), LOCAL, "keep"),
    ).toEqual([]);
  });

  it("returns declaring block id for delete", () => {
    expect(
      resolveDefiningBlockDeleteIds(snapshot(), LOCAL, "delete"),
    ).toEqual(["declaring"]);
  });

  it("omits declaring row from persisted floDown after delete", () => {
    const next = retargetLocalSymbolSnapshot(snapshot(), LOCAL, MATHHUB);
    const deleteIds = resolveDefiningBlockDeleteIds(snapshot(), LOCAL, "delete");
    const persisted = next.floDown.filter((row) => !deleteIds.includes(row.id));
    expect(persisted.map((row) => row.id)).toEqual(["discarded"]);
    expect(astReferencesUri(persisted[0].statement, MATHHUB)).toBe(true);
    expect(astReferencesUri(persisted[0].statement, LOCAL)).toBe(false);
  });

  it("rejects delete when the declaring block has other local declarations", () => {
    const multi: RetargetSnapshot = {
      ...snapshot(),
      floDown: [
        {
          ...snapshot().floDown[0],
          declaredSymbolsInfo: [
            ...(snapshot().floDown[0].declaredSymbolsInfo as object[]),
            {
              symbolName: "other",
              symbolUri: "http://mathhub.info/?a=glox/local&p=mod&d=other&s=other",
              hasConfirmed: false,
              confirmedById: null,
              confirmedBy: null,
            },
          ],
        },
        snapshot().floDown[1],
      ],
    };
    expect(() =>
      resolveDefiningBlockDeleteIds(multi, LOCAL, "delete"),
    ).toThrow(/declares other local symbols/);
  });
});

describe("roleMayReplaceLocalSymbolWithMathHub (S-SYM-15 / R-SYM-06 / R-SYM-07)", () => {
  it("MUST NOT allow Extractor", () => {
    expect(roleMayReplaceLocalSymbolWithMathHub("EXTRACTOR")).toBe(false);
  });

  it("MUST NOT allow unauthenticated", () => {
    expect(roleMayReplaceLocalSymbolWithMathHub(null)).toBe(false);
    expect(roleMayReplaceLocalSymbolWithMathHub(undefined)).toBe(false);
  });

  it("allows Curator and Admin", () => {
    expect(roleMayReplaceLocalSymbolWithMathHub("CURATOR")).toBe(true);
    expect(roleMayReplaceLocalSymbolWithMathHub("ADMIN")).toBe(true);
  });
});
