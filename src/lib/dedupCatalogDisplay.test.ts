import { describe, expect, it } from "vitest";
import type { CatalogSymbol } from "@/server/symbolCatalog";
import {
  CONFIRMED_NOT_DUPLICATE_SECTION_TITLE,
  DEDUP_PAGE_SIZE,
  paginateDedupCatalog,
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

describe("paginateDedupCatalog (R-SYM-24)", () => {
  it("keeps page size at 20 grouped entries", () => {
    expect(DEDUP_PAGE_SIZE).toBe(20);
  });

  it("slices unconfirmed before confirmed across pages", () => {
    const unconfirmed = Array.from({ length: 22 }, (_, i) => `u${i}`);
    const confirmed = ["c0", "c1"];
    const page1 = paginateDedupCatalog(unconfirmed, confirmed, 1);
    expect(page1.unconfirmed).toHaveLength(20);
    expect(page1.confirmed).toEqual([]);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalEntries).toBe(24);

    const page2 = paginateDedupCatalog(unconfirmed, confirmed, 2);
    expect(page2.unconfirmed).toEqual(["u20", "u21"]);
    expect(page2.confirmed).toEqual(["c0", "c1"]);
  });

  it("clamps an out-of-range page to the last page", () => {
    const page = paginateDedupCatalog(["a"], [], 9, 20);
    expect(page.unconfirmed).toEqual(["a"]);
    expect(page.totalPages).toBe(1);
  });
});
