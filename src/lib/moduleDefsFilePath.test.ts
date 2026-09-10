import { describe, expect, it } from "vitest";
import {
  defaultDefsFilePath,
  resolveDefsFilePath,
} from "./moduleDefsFilePath";

describe("defaultDefsFilePath (S-MOD-07)", () => {
  it("uses defs/{slug} from hierarchy subject area", () => {
    expect(defaultDefsFilePath("Data Science")).toBe("defs/data-science");
  });

  it("falls back to defs when subject area is absent", () => {
    expect(defaultDefsFilePath(null)).toBe("defs");
    expect(defaultDefsFilePath("")).toBe("defs");
    expect(defaultDefsFilePath("   ")).toBe("defs");
  });

  it("preserves non-ASCII characters in the slug", () => {
    expect(defaultDefsFilePath("Logopädie")).toBe("defs/logopädie");
  });
});

describe("resolveDefsFilePath (S-MOD-07)", () => {
  it("keeps an explicit client override", () => {
    expect(resolveDefsFilePath("defs/custom", "Data Science")).toBe(
      "defs/custom",
    );
  });

  it("derives from subject area when client value is blank", () => {
    expect(resolveDefsFilePath(undefined, "Data Science")).toBe(
      "defs/data-science",
    );
    expect(resolveDefsFilePath("  ", "Data Science")).toBe("defs/data-science");
  });
});
