import { describe, expect, it } from "vitest";
import {
  catalogDeclaresUri,
  createDeclarationRecord,
  declaredUrisFromJson,
  declaredNamesFromJson,
  isDeclaredLocalUri,
  localDeclarationUris,
  matchesCatalogQuery,
  otherBlockDeclaresUri,
  parseDeclaredSymbolsInfo,
  setDeclarationConfirmation,
} from "./declaredSymbolsInfo";
import {
  replaceOpaqueUrisInValue,
  replacementMapFromPairs,
} from "./opaqueSymbolUriReplace";

const SAMPLE_URI = "http://mathhub.info?a=smglom/g&p=mod&m=t&s=triangle";
const OTHER_URI = "http://mathhub.info?a=smglom/g&p=mod&m=t&s=angle";
const MATHHUB = "http://mathhub.info?a=smglom/algebra&p=mod&m=Boolean-algebra&s=Boolean%20algebra";

describe("isDeclaredLocalUri", () => {
  it("matches catalog URIs, not MathHub-vs-HTTP guessing", () => {
    expect(isDeclaredLocalUri([SAMPLE_URI], SAMPLE_URI)).toBe(true);
    expect(isDeclaredLocalUri([SAMPLE_URI], MATHHUB)).toBe(false);
    expect(isDeclaredLocalUri([], SAMPLE_URI)).toBe(false);
  });
});

describe("catalogDeclaresUri", () => {
  it("treats a URI as local when any live catalog row declares it", () => {
    expect(
      catalogDeclaresUri(
        [
          {
            declaredSymbolsInfo: [
              { symbolName: "triangle", symbolUri: SAMPLE_URI },
            ],
          },
        ],
        SAMPLE_URI,
      ),
    ).toBe(true);
    expect(
      catalogDeclaresUri(
        [
          {
            declaredSymbolsInfo: [
              { symbolName: "triangle", symbolUri: SAMPLE_URI },
            ],
          },
        ],
        MATHHUB,
      ),
    ).toBe(false);
  });
});

describe("localDeclarationUris", () => {
  it("prefers catalog URIs over a URI-list fallback", () => {
    expect(
      localDeclarationUris(
        [{ symbolName: "triangle", symbolUri: SAMPLE_URI }],
        [OTHER_URI],
      ),
    ).toEqual([SAMPLE_URI]);
  });
});

describe("parseDeclaredSymbolsInfo", () => {
  it("keeps valid records and drops incomplete ones", () => {
    expect(
      parseDeclaredSymbolsInfo([
        { symbolName: "triangle", symbolUri: SAMPLE_URI, hasConfirmed: true },
        { symbolName: "skip" },
        null,
      ]),
    ).toEqual([
      {
        symbolName: "triangle",
        symbolUri: SAMPLE_URI,
        hasConfirmed: true,
        confirmedById: null,
        confirmedBy: null,
      },
    ]);
  });
});

describe("createDeclarationRecord", () => {
  it("rejects a missing symbol URI", () => {
    expect(() =>
      createDeclarationRecord({ symbolName: "triangle", symbolUri: "  " }),
    ).toThrow("Symbol URI required");
  });
});

describe("otherBlockDeclaresUri", () => {
  it("rejects a second live declaration of the same URI", () => {
    expect(
      otherBlockDeclaresUri(
        [
          {
            id: "a",
            declaredSymbolsInfo: [
              { symbolName: "triangle", symbolUri: SAMPLE_URI },
            ],
          },
          { id: "b", declaredSymbolsInfo: [] },
        ],
        "b",
        SAMPLE_URI,
      ),
    ).toBe(true);
  });

  it("ignores discarded blocks", () => {
    expect(
      otherBlockDeclaresUri(
        [
          {
            id: "a",
            status: "DISCARDED",
            declaredSymbolsInfo: [
              { symbolName: "triangle", symbolUri: SAMPLE_URI },
            ],
          },
        ],
        "b",
        SAMPLE_URI,
      ),
    ).toBe(false);
  });
});

describe("matchesCatalogQuery", () => {
  it("matches symbolName contains", () => {
    expect(
      matchesCatalogQuery(
        {
          symbolName: "triangle",
          symbolUri: SAMPLE_URI,
          hasConfirmed: false,
          confirmedById: null,
          confirmedBy: null,
        },
        "ang",
      ),
    ).toBe(true);
  });
});

describe("setDeclarationConfirmation", () => {
  it("writes confirmation onto the matching URI", () => {
    const next = setDeclarationConfirmation(
      [
        {
          symbolName: "triangle",
          symbolUri: SAMPLE_URI,
          hasConfirmed: false,
          confirmedById: null,
          confirmedBy: null,
        },
      ],
      SAMPLE_URI,
      {
        hasConfirmed: true,
        confirmedById: "user-1",
        confirmedBy: "Ada",
      },
    );
    expect(next[0]).toMatchObject({
      hasConfirmed: true,
      confirmedById: "user-1",
      confirmedBy: "Ada",
    });
  });
});

describe("replaceOpaqueUrisInValue", () => {
  it("replaces listed URIs in statements and leaves unlisted MathHub URIs", () => {
    const map = replacementMapFromPairs([
      { oldUri: SAMPLE_URI, newUri: OTHER_URI },
    ]);
    const next = replaceOpaqueUrisInValue(
      {
        type: "paragraph",
        content: [
          { type: "symref", uri: SAMPLE_URI, content: ["t"] },
          { type: "symref", uri: MATHHUB, content: ["b"] },
        ],
      },
      map,
    );
    expect(next).toEqual({
      type: "paragraph",
      content: [
        { type: "symref", uri: OTHER_URI, content: ["t"] },
        { type: "symref", uri: MATHHUB, content: ["b"] },
      ],
    });
  });

  it("replaces a short name leaf used by backfill", () => {
    const map = replacementMapFromPairs([
      {
        oldUri: "triangle",
        newUri: SAMPLE_URI,
      },
    ]);
    expect(
      replaceOpaqueUrisInValue({ type: "definiendum", uri: "triangle" }, map),
    ).toEqual({ type: "definiendum", uri: SAMPLE_URI });
  });
});

describe("declaredUrisFromJson", () => {
  it("returns symbolUri values", () => {
    expect(
      declaredUrisFromJson([{ symbolName: "triangle", symbolUri: SAMPLE_URI }]),
    ).toEqual([SAMPLE_URI]);
  });
});

describe("declaredNamesFromJson", () => {
  it("returns symbolName values for FloDown addSymbolDeclaration", () => {
    expect(
      declaredNamesFromJson([{ symbolName: "triangle", symbolUri: SAMPLE_URI }]),
    ).toEqual(["triangle"]);
  });
});
