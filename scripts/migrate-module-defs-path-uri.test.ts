// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  defaultDefsFilePath,
  getQueryParam,
  rewriteUriDefsPath,
} from "./migrate-module-defs-path-uri.mjs";

const BASE =
  "http://mathhub.info?a=courses/FAU/module-descriptions&p=defs&m=approach&s=Group";

describe("defaultDefsFilePath", () => {
  it("slugifies subject area", () => {
    expect(defaultDefsFilePath("Data Science")).toBe("defs/data-science");
  });

  it("falls back to defs", () => {
    expect(defaultDefsFilePath(null)).toBe("defs");
    expect(defaultDefsFilePath("")).toBe("defs");
  });
});

describe("getQueryParam", () => {
  it("reads p=defs", () => {
    expect(getQueryParam(BASE, "p")).toBe("defs");
    expect(getQueryParam(BASE, "m")).toBe("approach");
  });

  it("returns null when missing", () => {
    expect(getQueryParam("http://mathhub.info?a=x", "p")).toBeNull();
  });
});

describe("rewriteUriDefsPath", () => {
  it("rewrites only exact p=defs", () => {
    expect(rewriteUriDefsPath(BASE, "defs/data-science")).toBe(
      "http://mathhub.info?a=courses/FAU/module-descriptions&p=defs/data-science&m=approach&s=Group",
    );
  });

  it("does not treat defs/foo as defs", () => {
    const uri =
      "http://mathhub.info?a=x&p=defs/foo&m=a&s=b";
    expect(rewriteUriDefsPath(uri, "defs/data-science")).toBeNull();
  });

  it("returns null without p=defs", () => {
    expect(
      rewriteUriDefsPath("http://mathhub.info?a=x&m=a&s=b", "defs/x"),
    ).toBeNull();
  });
});
