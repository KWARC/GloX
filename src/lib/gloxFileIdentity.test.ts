import { describe, expect, it } from "vitest";
import {
  formatGloxBlockIdentity,
  gloxIdentityDisplayFields,
} from "./gloxFileIdentity";

describe("gloxIdentityDisplayFields", () => {
  it("returns document identity fields without splitting on slashes", () => {
    expect(
      gloxIdentityDisplayFields({
        futureRepo: "courses/FAU/module-descriptions",
        filePath: "smglom/cs/part1",
        language: "en",
      }),
    ).toEqual([
      "courses/FAU/module-descriptions",
      "smglom/cs/part1",
      "en",
    ]);
  });

  it("includes fileName for block identity", () => {
    expect(
      gloxIdentityDisplayFields({
        futureRepo: "courses/FAU/module-descriptions",
        filePath: "smglom/cs",
        fileName: "derivative-rules",
        language: "de",
      }),
    ).toEqual([
      "courses/FAU/module-descriptions",
      "smglom/cs",
      "derivative-rules",
      "de",
    ]);
  });
});

describe("formatGloxBlockIdentity", () => {
  it("formats bracketed single-line label", () => {
    expect(
      formatGloxBlockIdentity({
        futureRepo: "smglom/softeng",
        filePath: "part1",
        fileName: "intro",
        language: "en",
      }),
    ).toBe("[smglom/softeng] [part1] [intro] [en]");
  });
});
