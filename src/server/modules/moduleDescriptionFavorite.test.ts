import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schemaPath = path.join(
  import.meta.dirname,
  "../../../prisma/schema.prisma",
);
const serverFnPath = path.join(
  import.meta.dirname,
  "../../serverFns/moduleDescription.server.ts",
);

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function extractModel(schema: string, name: string): string | null {
  const match = schema.match(
    new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
  );
  return match?.[1] ?? null;
}

describe("ModuleDescriptionFavorite schema (S-MOD-28, S-MOD-29)", () => {
  it("S-MOD-28 names ModuleDescriptionFavorite with unique user + module pair", () => {
    const schema = read(schemaPath);
    const body = extractModel(schema, "ModuleDescriptionFavorite");
    expect(body).not.toBeNull();
    expect(body).toMatch(/userId\s+String/);
    expect(body).toMatch(/moduleDescriptionId\s+String/);
    expect(body).toMatch(/@@unique\(\[\s*userId\s*,\s*moduleDescriptionId\s*\]\)/);
    expect(schema).not.toMatch(
      /model ModuleDescriptionFavorite[\s\S]*implicit/i,
    );
  });

  it("S-MOD-28 MUST NOT store a shared favorite boolean on ModuleDescription", () => {
    const body = extractModel(read(schemaPath), "ModuleDescription");
    expect(body).not.toBeNull();
    expect(body).not.toMatch(/\bisFavorite\b/);
    expect(body).not.toMatch(/\bfavorite\s+Boolean\b/);
  });

  it("S-MOD-29 cascades favorites when ModuleDescription is deleted", () => {
    const body = extractModel(read(schemaPath), "ModuleDescriptionFavorite");
    expect(body).not.toBeNull();
    expect(body).toMatch(
      /moduleDescription\s+ModuleDescription[\s\S]*onDelete:\s*Cascade/,
    );
  });
});

describe("list and toggle serverFns (S-MOD-26, S-MOD-27, S-MOD-13)", () => {
  it("S-MOD-27 exports toggleModuleDescriptionFavorite", () => {
    const src = read(serverFnPath);
    expect(src.includes("export const toggleModuleDescriptionFavorite")).toBe(
      true,
    );
  });

  it("S-MOD-13 toggle calls requireExtractorPlus (no client userId)", () => {
    const src = read(serverFnPath);
    const start = src.indexOf("export const toggleModuleDescriptionFavorite");
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = src.slice(start, start + 1200);
    expect(slice).toMatch(/requireExtractorPlus/);
    expect(slice).not.toMatch(/data\.userId/);
  });

  it("S-MOD-26 list includes isFavorite and optional favoritesOnly", () => {
    const src = read(serverFnPath);
    const start = src.indexOf("export const listModuleDescriptions");
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = src.slice(start, src.indexOf("export const", start + 1));
    expect(slice).toMatch(/favoritesOnly/);
    expect(slice).toMatch(/isFavorite/);
  });

  it("S-MOD-27 page payload includes caller isFavorite", () => {
    const src = read(serverFnPath);
    const start = src.indexOf("export const getModuleDescriptionPage");
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = src.slice(start, src.indexOf("export const", start + 1));
    expect(slice).toMatch(/isFavorite/);
    expect(slice).toMatch(/requireExtractorPlus/);
    expect(slice).toMatch(/where:\s*\{\s*userId/);
  });
});
