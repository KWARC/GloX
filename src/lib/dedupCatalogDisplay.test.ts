import { describe, expect, it } from "vitest";
import type { CatalogSymbol } from "@/server/symbolCatalog";
import {
  CONFIRMED_NOT_DUPLICATE_SECTION_TITLE,
  partitionDedupCatalog,
} from "./dedupCatalogDisplay";

function symbol(
  partial: Pick<CatalogSymbol, "symbolUri" | "symbolName" | "hasConfirmed">,
): CatalogSymbol {
  return {
    id: partial.symbolUri,
    alias: null,
    futureRepo: "r",
    filePath: "p",
    fileName: "f",
    language: "en",
    confirmedById: null,
    confirmedBy: null,
    floDownBlockId: "b",
    ...partial,
  };
}

describe("partitionDedupCatalog (R-SYM-22)", () => {
  it("puts confirmed declarations in a trailing group", () => {
    const open = symbol({
      symbolUri: "http://u/a",
      symbolName: "alpha",
      hasConfirmed: false,
    });
    const done = symbol({
      symbolUri: "http://u/b",
      symbolName: "beta",
      hasConfirmed: true,
    });
    const { unconfirmed, confirmed } = partitionDedupCatalog([done, open]);
    expect(unconfirmed.map((row) => row.symbolName)).toEqual(["alpha"]);
    expect(confirmed.map((row) => row.symbolName)).toEqual(["beta"]);
  });

  it("uses section title Confirmed not a duplicate", () => {
    expect(CONFIRMED_NOT_DUPLICATE_SECTION_TITLE).toBe(
      "Confirmed not a duplicate",
    );
  });
});
