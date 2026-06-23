import type { ExtractedItem } from "@/server/text-selection";
import type { FtmlStatement } from "@/types/ftml.types";
import { describe, expect, it } from "vitest";
import { Catalog, stemWord, Verbalization } from "../symbolic-catalog/catalogSearch";
import {
  buildStaticCatalog,
  isEligibleForAutomaticSuggestion,
  searchReferenceCandidates,
  suggestRefsForDefinition,
} from "../symbolic-suggestions";

type SymbolEntry = { uri: string };

function makeCatalog(entries: Array<[string, string]>) {
  const catalog = new Catalog<SymbolEntry, Verbalization>(
    "en",
    (symbol) => symbol.uri,
  );
  for (const [uri, phrase] of entries) {
    catalog.addSymbVerb({ uri }, new Verbalization(phrase));
  }
  return catalog;
}

function definition(text: string): ExtractedItem {
  const statement = {
    type: "definition",
    for_symbols: [],
    content: [{ type: "paragraph", content: [text] }],
  } satisfies FtmlStatement;

  return {
    id: "definition",
    documentId: "document",
    pageNumber: 1,
    kind: "Definition",
    statement,
    futureRepo: "repo",
    filePath: "module",
    fileName: "file",
    language: "en",
  };
}

const staticCatalog = buildStaticCatalog([
  {
    id: "a",
    name: "A",
    aliases: [],
    symbolicUri: "http://mathhub.info?a=repo&p=mod&m=file&s=a",
    language: "en",
  },
  {
    id: "group",
    name: "group",
    aliases: [],
    symbolicUri: "http://mathhub.info?a=repo&p=mod&m=file&s=group",
    language: "en",
  },
]);

describe("symbolic suggestion module boundaries", () => {
  it("keeps language stemming behavior", () => {
    expect(stemWord("groups", "en")).toBe("group");
    expect(stemWord("Speicherbeh\u00e4ltern", "de")).toBe("speicherbehal");
    expect(stemWord("chevaux", "fr")).toBe("cheval");
  });

  it("keeps earliest-longest matching and source offsets", () => {
    const text = "A (finite-state machine) and a group";
    const catalog = makeCatalog([
      ["finite", "finite"],
      ["machine", "finite state machine"],
      ["group", "group"],
    ]);
    const match = catalog.findFirstMatch(text);

    expect(match).toMatchObject({ start: 3, end: 23 });
    expect(match?.candidates[0][0].uri).toBe("machine");
    expect(text.slice(match?.start, match?.end)).toBe("finite-state machine");
  });

  it("filters automatic noise without changing manual search", () => {
    expect(isEligibleForAutomaticSuggestion("A", "en")).toBe(false);
    expect(isEligibleForAutomaticSuggestion("this", "en")).toBe(false);
    expect(
      suggestRefsForDefinition(definition("A group"), staticCatalog)
        .suggestions.map((suggestion) => suggestion.text),
    ).toEqual(["group"]);
    expect(searchReferenceCandidates("A", staticCatalog)).toHaveLength(1);
  });
});
