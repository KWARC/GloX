import { describe, expect, it } from "vitest";
import {
  buildModuleLocalSymbolUriMap,
  collectDeclaredSymbolsForDefinitionBlock,
} from "./moduleLocalSymbols";
import type { FloDownStatement } from "@/types/floDown.types";

const TRIANGLE_URI =
  "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle";

const triangleDef = (verbalization: string): FloDownStatement => ({
  type: "definition",
  for_symbols: [],
  content: [
    {
      type: "paragraph",
      content: [
        { type: "definiendum", uri: TRIANGLE_URI, content: [verbalization] },
      ],
    },
  ],
});

describe("collectDeclaredSymbolsForDefinitionBlock", () => {
  it("returns stored declaration names, not importing definienda", () => {
    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbolsInfo: [
          { symbolName: "triangle", symbolUri: TRIANGLE_URI },
        ],
      }),
    ).toEqual(["triangle", TRIANGLE_URI]);

    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbols: [],
      }),
    ).toEqual([]);
  });
});

describe("buildModuleLocalSymbolUriMap", () => {
  it("uses stored declaration URIs and ignores importing definienda", () => {
    const map = buildModuleLocalSymbolUriMap([
      {
        declaredSymbols: [TRIANGLE_URI],
        declaredSymbolsInfo: [
          { symbolName: "triangle", symbolUri: TRIANGLE_URI },
        ],
        statement: triangleDef("triangle"),
        futureRepo: "smglom/geometry",
        filePath: "mod",
        fileName: "triangle",
        language: "en",
      },
      {
        declaredSymbols: [],
        statement: triangleDef("Dreieck"),
        futureRepo: "smglom/geometry",
        filePath: "mod",
        fileName: "triangle",
        language: "de",
      },
    ]);

    expect(map.get("triangle")).toBe(TRIANGLE_URI);
    expect(map.get(TRIANGLE_URI)).toBe(TRIANGLE_URI);
  });
});
