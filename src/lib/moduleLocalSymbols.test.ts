import { describe, expect, it } from "vitest";
import {
  buildModuleLocalSymbolUriMap,
  collectDeclaredSymbolsForDefinitionBlock,
} from "./moduleLocalSymbols";
import type { FloDownStatement } from "@/types/floDown.types";

const triangleDef = (verbalization: string): FloDownStatement => ({
  type: "definition",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "definiendum", uri: "triangle", content: [verbalization] },
      ],
    },
  ],
});

describe("collectDeclaredSymbolsForDefinitionBlock", () => {
  it("returns declaredSymbols only, not definiendum names", () => {
    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbols: ["triangle"],
        statement: triangleDef("triangle"),
      }),
    ).toEqual(["triangle"]);

    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbols: [],
        statement: triangleDef("Dreieck"),
      }),
    ).toEqual([]);
  });
});

describe("buildModuleLocalSymbolUriMap", () => {
  it("mints the declaring file URI and ignores importing definienda", () => {
    const map = buildModuleLocalSymbolUriMap([
      {
        declaredSymbols: ["triangle"],
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

    expect(map.get("triangle")).toBe(
      "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle",
    );
    expect(map.size).toBe(1);
  });

  it("keeps the first declaration when authors declare the same name twice", () => {
    const map = buildModuleLocalSymbolUriMap([
      {
        declaredSymbols: ["triangle"],
        statement: triangleDef("triangle"),
        futureRepo: "smglom/geometry",
        filePath: "mod",
        fileName: "triangle",
      },
      {
        declaredSymbols: ["triangle"],
        statement: triangleDef("Dreieck"),
        futureRepo: "smglom/geometry",
        filePath: "mod",
        fileName: "triangle-de",
      },
    ]);

    expect(map.get("triangle")).toBe(
      "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle",
    );
  });
});
