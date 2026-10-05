import { describe, expect, it } from "vitest";
import {
  DEDUP_SEARCH_PAGE_SIZE,
  nextDedupSearchVisibleCount,
} from "./dedupSearchWindow";

describe("nextDedupSearchVisibleCount", () => {
  it("starts at five results", () => {
    expect(DEDUP_SEARCH_PAGE_SIZE).toBe(5);
  });

  it("reveals five more and stops at the result count", () => {
    expect(nextDedupSearchVisibleCount(5, 12)).toBe(10);
    expect(nextDedupSearchVisibleCount(10, 12)).toBe(12);
  });

  it("returns to five when every result is already visible", () => {
    expect(nextDedupSearchVisibleCount(12, 12)).toBe(5);
    expect(nextDedupSearchVisibleCount(15, 15)).toBe(5);
  });
});
