import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverFnPath = path.join(
  import.meta.dirname,
  "../../serverFns/moduleDescription.server.ts",
);

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function handlerSlice(src: string): string {
  const start = src.indexOf("export const createModuleDefinitionBlock");
  expect(start).toBeGreaterThanOrEqual(0);
  const end = src.indexOf("export const deleteModuleDescription", start);
  return src.slice(start, end);
}

describe("createModuleDefinitionBlock (S-MOD-05)", () => {
  it("accepts optional symbolName and declaredSymbolsInfo for manual create", () => {
    const slice = handlerSlice(read(serverFnPath));
    expect(slice).toMatch(/symbolName\?: string/);
    expect(slice).toMatch(/declaredSymbolsInfo\?: DeclaredSymbolDraft\[\]/);
    expect(slice).toMatch(/setDeclaredSymbolsInfo/);
    expect(slice).not.toMatch(/!symbolName/);
  });

  it("requires paragraph file name and original text only", () => {
    const slice = handlerSlice(read(serverFnPath));
    expect(slice).toMatch(/if \(!paragraphFileName \|\| !originalText\)/);
  });

  it("still declares a symbol when symbolName and symbolUri are provided", () => {
    const slice = handlerSlice(read(serverFnPath));
    expect(slice).toMatch(/addDeclaredSymbol/);
    expect(slice).toMatch(/symbolName && isNewSymbol && !symbolUri/);
  });

  it("guards duplicate module descriptions", () => {
    const slice = handlerSlice(read(serverFnPath));
    expect(slice).toMatch(/assertNotDuplicateDescription/);
    expect(slice).toMatch(/requireExtractorPlus/);
  });
});
