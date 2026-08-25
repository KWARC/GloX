import { describe, expect, it } from "vitest";
import { documentUriFromGlox } from "./flodownUris";
import {
  buildTexZipEntries,
  createTexZipBlob,
  defaultTexZipFileName,
  texZipPathFromDocumentUri,
} from "./texZipExport";

describe("texZipExport", () => {
  it("builds zip paths from document URI archive and path", () => {
    const moduleUri = documentUriFromGlox({
      futureRepo: "courses/FAU/module-descriptions",
      filePath: "modules",
      fileName: "121455",
      language: "en",
    });
    expect(texZipPathFromDocumentUri(moduleUri, "121455.en.tex")).toBe(
      "courses/FAU/module-descriptions/modules/121455.en.tex",
    );

    const defUri = documentUriFromGlox({
      futureRepo: "courses/FAU/module-descriptions",
      filePath: "defs",
      fileName: "approach",
      language: "en",
    });
    expect(texZipPathFromDocumentUri(defUri, "approach.en.tex")).toBe(
      "courses/FAU/module-descriptions/defs/approach.en.tex",
    );
  });

  it("omits path segment when p= is absent", () => {
    const uri = documentUriFromGlox({
      futureRepo: "test/archive",
      filePath: "",
      fileName: "doc",
      language: "en",
    });
    expect(texZipPathFromDocumentUri(uri, "doc.en.tex")).toBe(
      "test/archive/doc.en.tex",
    );
  });

  it("builds zip entries for module and definition files", () => {
    const files = [
      {
        fileName: "121455.en.tex",
        tex: "\\module{title}",
        uri: documentUriFromGlox({
          futureRepo: "courses/FAU/module-descriptions",
          filePath: "modules",
          fileName: "121455",
          language: "en",
        }),
      },
      {
        fileName: "approach.en.tex",
        tex: "\\begin{definition}",
        uri: documentUriFromGlox({
          futureRepo: "courses/FAU/module-descriptions",
          filePath: "defs",
          fileName: "approach",
          language: "en",
        }),
      },
    ];

    expect(buildTexZipEntries(files)).toEqual([
      {
        zipPath: "courses/FAU/module-descriptions/modules/121455.en.tex",
        content: "\\module{title}",
      },
      {
        zipPath: "courses/FAU/module-descriptions/defs/approach.en.tex",
        content: "\\begin{definition}",
      },
    ]);
  });

  it("creates a non-empty zip blob", () => {
    const blob = createTexZipBlob([
      {
        zipPath: "courses/FAU/module-descriptions/modules/121455.en.tex",
        content: "\\module{title}",
      },
    ]);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("derives default zip file name from first document name", () => {
    const files = [
      {
        fileName: "121455.en.tex",
        tex: "",
        uri: documentUriFromGlox({
          futureRepo: "courses/FAU/module-descriptions",
          filePath: "modules",
          fileName: "121455",
          language: "en",
        }),
      },
    ];
    expect(defaultTexZipFileName(files)).toBe("121455-latex.zip");
  });
});
