import { assertFloDownStatement } from "@/types/floDown.types";
import { describe, expect, it } from "vitest";
import {
  prepareFloDownBlockForPersist,
  syncDeclaredSymbolsFromDefinienda,
} from "./declaredSymbols";

describe("syncDeclaredSymbolsFromDefinienda", () => {
  it("keeps existing declared symbols", () => {
    expect(
      syncDeclaredSymbolsFromDefinienda(
        {
          type: "definition",
          for_symbols: [],
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "definiendum",
                  uri: "ignored",
                  content: ["ignored"],
                },
              ],
            },
          ],
        },
        ["existing"],
      ),
    ).toEqual(["existing"]);
  });

  it("infers local definiendum names when declaredSymbols is empty", () => {
    expect(
      syncDeclaredSymbolsFromDefinienda(
        {
          type: "definition",
          for_symbols: [],
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "definiendum",
                  uri: "production bottlenecks",
                  content: ["production bottlenecks"],
                },
              ],
            },
          ],
        },
        [],
      ),
    ).toEqual(["production bottlenecks"]);
  });
});

describe("prepareFloDownBlockForPersist", () => {
  it("sanitizes statement and syncs declaredSymbols", () => {
    const { statement, declaredSymbols } = prepareFloDownBlockForPersist(
      assertFloDownStatement({
        type: "definition",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "definiendum",
                uri: "Foo",
                content: ["Foo"],
                symdecl: true,
              },
            ],
          },
        ],
      }),
      [],
    );

    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [],
      content: [
        {
          type: "paragraph",
          content: [{ type: "definiendum", uri: "Foo", content: ["Foo"] }],
        },
      ],
    });
    expect(declaredSymbols).toEqual(["Foo"]);
  });
});
