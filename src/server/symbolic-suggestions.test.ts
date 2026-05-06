import { ExtractedItem } from "@/server/text-selection";
import { FtmlStatement } from "@/types/ftml.types";
import { describe, expect, it } from "vitest";
import {
  buildDefinitionCatalog,
  extractPlainText,
  suggestRefsForDefinition,
} from "./symbolic-suggestions";

function item(id: string, statement: FtmlStatement): ExtractedItem {
  return {
    id,
    pageNumber: 1,
    statement,
    futureRepo: "repo",
    filePath: "mod",
    fileName: "File",
    language: "en",
  };
}

const staticCatalog = [
  {
    id: "http://mathhub.info?a=repo&p=mod&m=file&s=prime",
    name: "prime number",
    canonicalForm: "prime number",
    aliases: ["prime"],
    symbolicUri: "http://mathhub.info?a=repo&p=mod&m=file&s=prime",
    symRef: {
      source: "MATHHUB" as const,
      uri: "http://mathhub.info?a=repo&p=mod&m=file&s=prime",
    },
  },
  {
    id: "uri-like",
    name: "repo/mod",
    canonicalForm: "repo/mod",
    aliases: ["a:b"],
    symbolicUri: "uri-like",
    symRef: {
      source: "MATHHUB" as const,
      uri: "http://mathhub.info?a=repo&p=mod&m=file&s=uri-like",
    },
  },
];

describe("symbolic suggestions", () => {
  it("extracts plain text from nested FTML", () => {
    const def = item("a", {
      type: "definition",
      content: [
        {
          type: "paragraph",
          content: [
            "A ",
            { type: "symref", uri: "x", content: ["prime"] },
            " number.",
          ],
        },
      ],
      for_symbols: [],
    });

    expect(extractPlainText(def.statement)).toBe("A prime number.");
  });

  it("matches names and aliases, ignores URI-like terms, and resolves overlap", () => {
    const def = item("a", {
      type: "definition",
      content: [
        {
          type: "paragraph",
          content: ["A prime number is not repo/mod or a:b."],
        },
      ],
      for_symbols: [],
    });

    const refs = suggestRefsForDefinition(def, staticCatalog);

    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      text: "prime number",
      startOffset: 2,
      endOffset: 14,
      targetName: "prime number",
      symRef: staticCatalog[0].symRef,
    });
  });

  it("builds local DB targets from declared definienda and skips self targets", () => {
    const source = item("source", {
      type: "definition",
      for_symbols: [],
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "definiendum",
              uri: "graph",
              symdecl: true,
              content: ["graph"],
            },
            " has vertices.",
          ],
        },
      ],
    });
    const target = item("target", {
      type: "definition",
      for_symbols: [],
      content: [{ type: "paragraph", content: ["A graph has edges."] }],
    });

    const catalog = buildDefinitionCatalog([source, target]);
    const refs = suggestRefsForDefinition(target, catalog);

    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      text: "graph",
      targetDefinitionId: "graph",
      symRef: {
        source: "DB",
        symbolName: "graph",
        futureRepo: "repo",
        filePath: "mod",
        fileName: "File",
        language: "en",
      },
    });
    expect(suggestRefsForDefinition(source, catalog)).toEqual([]);
  });

  it("does not suggest text inside existing semantic nodes", () => {
    const def = item("a", {
      type: "definition",
      content: [
        {
          type: "paragraph",
          content: [
            "A ",
            { type: "symref", uri: "old", content: ["prime number"] },
            " remains marked.",
          ],
        },
      ],
      for_symbols: [],
    });

    expect(suggestRefsForDefinition(def, staticCatalog)).toEqual([]);
  });
});
