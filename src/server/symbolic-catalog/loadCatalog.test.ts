import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStaticCatalogCacheForTests, getStaticCatalog } from "./loadCatalog";

function withTempCwd() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "glox-catalog-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  clearStaticCatalogCacheForTests();
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
  clearStaticCatalogCacheForTests();
});

describe("getStaticCatalog", () => {
  it("loads root catalog.json catalog_by_archive entries", () => {
    const dir = withTempCwd();
    fs.writeFileSync(
      path.join(dir, "catalog.json"),
      JSON.stringify({
        catalog_by_archive: {
          archive: [
            {
              verb: "module",
              symbol: "http://mathhub.info?a=FTML/doc&p=mod&m=domain&s=module",
            },
          ],
        },
      }),
    );

    expect(getStaticCatalog()).toEqual([
      {
        id: "http://mathhub.info?a=FTML/doc&p=mod&m=domain&s=module",
        name: "module",
        aliases: [],
        symbolicUri: "http://mathhub.info?a=FTML/doc&p=mod&m=domain&s=module",
      },
    ]);
  });

  it("returns an empty catalog when the file is missing or invalid", () => {
    withTempCwd();

    expect(getStaticCatalog()).toEqual([]);
  });
});
