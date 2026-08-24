import { assertFloDownStatement } from "@/types/floDown.types";
import { describe, expect, it } from "vitest";
import { prepareFloDownBlockForPersist } from "./declaredSymbols";

describe("prepareFloDownBlockForPersist", () => {
  it("strips symdecl and keeps an empty declaredSymbols list", () => {
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
    expect(declaredSymbols).toEqual([]);
  });

  it("does not copy definiendum names into declaredSymbols", () => {
    const { declaredSymbols } = prepareFloDownBlockForPersist(
      {
        type: "definition",
        for_symbols: [],
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "definiendum",
                uri: "triangle",
                content: ["Dreieck"],
              },
            ],
          },
        ],
      },
      [],
    );

    expect(declaredSymbols).toEqual([]);
  });

  it("keeps caller-supplied declaredSymbols", () => {
    const { declaredSymbols } = prepareFloDownBlockForPersist(
      {
        type: "definition",
        for_symbols: [],
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "definiendum",
                uri: "triangle",
                content: ["triangle"],
              },
            ],
          },
        ],
      },
      ["triangle"],
    );

    expect(declaredSymbols).toEqual(["triangle"]);
  });
});
