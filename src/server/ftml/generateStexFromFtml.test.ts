import { beforeEach, describe, expect, it, vi } from "vitest";

const addSymbolDeclaration = vi.fn((name: string) => `uri:${name}`);
const addElement = vi.fn();
const getStex = vi.fn(() => "\\symdecl*{triangle}");

vi.mock("@/lib/flodownClient", () => ({
  initFloDown: vi.fn(async () => ({ FloDown: {} })),
}));

vi.mock("@/lib/flodownUris", () => ({
  createFloDownDocumentFromGlox: vi.fn(() => ({
    addSymbolDeclaration,
    addElement,
    getStex,
  })),
}));

import { generateStexFromFloDown } from "./generateStexFromFtml";

describe("generateStexFromFloDown", () => {
  beforeEach(() => {
    addSymbolDeclaration.mockClear();
    addElement.mockClear();
    getStex.mockClear();
  });

  it("registers declaration names before mounting statement blocks", async () => {
    const stex = await generateStexFromFloDown(
      {
        type: "root",
        content: [
          {
            type: "definition",
            for_symbols: ["http://mathhub.info?s=triangle"],
            content: [{ type: "paragraph", content: ["A triangle."] }],
          },
        ],
      },
      "archive",
      "path",
      "triangle",
      [["triangle"], ["triangle"]],
      "en",
    );

    expect(addSymbolDeclaration.mock.invocationCallOrder[0]).toBeLessThan(
      addElement.mock.invocationCallOrder[0],
    );
    expect(addSymbolDeclaration).toHaveBeenCalledTimes(1);
    expect(addSymbolDeclaration).toHaveBeenCalledWith("triangle");
    expect(stex).toBe("\\symdecl*{triangle}");
  });
});
