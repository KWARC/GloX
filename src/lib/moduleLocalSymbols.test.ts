import { describe, expect, it } from "vitest";
import { collectDeclaredSymbolsForDefinitionBlock } from "./moduleLocalSymbols";

const TRIANGLE_URI =
  "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle";

describe("collectDeclaredSymbolsForDefinitionBlock", () => {
  it("returns stored declaration URIs, not importing definienda", () => {
    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbolsInfo: [
          { symbolName: "triangle", symbolUri: TRIANGLE_URI },
        ],
      }),
    ).toEqual([TRIANGLE_URI]);

    expect(
      collectDeclaredSymbolsForDefinitionBlock({
        declaredSymbols: [],
      }),
    ).toEqual([]);
  });
});

