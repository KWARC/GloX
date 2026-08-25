import { describe, expect, it } from "vitest";
import {
  documentUri,
  documentUriFromGlox,
  FloDownLanguage,
  languageToFloDown,
  parseDocumentUri,
  scratchDocumentUri,
} from "./flodownUris";

describe("flodownUris", () => {
  it("builds document URIs with archive in a= and path in p=", () => {
    const uri = documentUriFromGlox({
      futureRepo: "smglom/softeng",
      filePath: "mod",
      fileName: "MyConcept",
      language: "en",
    });
    expect(uri).toBe(
      "http://mathhub.info?a=smglom/softeng&p=mod&d=MyConcept&l=en",
    );
    expect(new URL(uri).hostname).toBe("mathhub.info");
    expect(new URL(uri).searchParams.get("a")).toBe("smglom/softeng");
    expect(new URL(uri).searchParams.get("p")).toBe("mod");
    expect(new URL(uri).searchParams.get("d")).toBe("MyConcept");
  });

  it("builds module file document URIs", () => {
    const uri = documentUriFromGlox({
      futureRepo: "courses/FAU/module-descriptions",
      filePath: "modules",
      fileName: "33995",
      language: "de",
    });
    expect(uri).toBe(
      "http://mathhub.info?a=courses/FAU/module-descriptions&p=modules&d=33995&l=de",
    );
    expect(new URL(uri).hostname).toBe("mathhub.info");
  });

  it("omits p= when path is empty", () => {
    const uri = documentUri({
      archive: "test",
      path: "",
      name: "doc",
      language: "en",
    });
    expect(uri).toBe("http://mathhub.info?a=test&d=doc&l=en");
    expect(new URL(uri).searchParams.get("p")).toBeNull();
  });

  it("puts archive in a=, host mathhub.info", () => {
    const uri = documentUriFromGlox({
      futureRepo: "courses/FAU/module-descriptions",
      filePath: "modules",
      fileName: "33995",
      language: "de",
    });
    expect(new URL(uri).hostname).toBe("mathhub.info");
    expect(new URL(uri).searchParams.get("a")).toBe(
      "courses/FAU/module-descriptions",
    );
  });

  it("maps ISO language codes to FloDown Language enum values", () => {
    expect(languageToFloDown("de")).toBe(FloDownLanguage.German);
    expect(languageToFloDown("en")).toBe(FloDownLanguage.English);
  });

  it("uses mathhub.info scratch documents", () => {
    expect(scratchDocumentUri("preview-1", "en")).toBe(
      "http://mathhub.info?a=no/archive&d=preview-1&l=en",
    );
  });

  it("round-trips document URIs through parseDocumentUri", () => {
    const identity = {
      futureRepo: "courses/FAU/module-descriptions",
      filePath: "modules",
      fileName: "121455",
      language: "en",
    };
    const uri = documentUriFromGlox(identity);
    expect(parseDocumentUri(uri)).toEqual({
      archive: identity.futureRepo,
      path: identity.filePath,
      name: identity.fileName,
      language: identity.language,
    });
  });
});

describe("buildModuleDescriptionStatement headings", () => {
  it("uses serde variant name Section, not numeric HeadingLevel", async () => {
    const { buildModuleDescriptionStatement } = await import(
      "./moduleDescriptionTex"
    );
    const statement = buildModuleDescriptionStatement({
      titleStatement: { type: "paragraph", content: ["t"] },
      inhaltStatement: { type: "paragraph", content: ["i"] },
      lernzieleStatement: { type: "paragraph", content: ["l"] },
    });
    const root = Array.isArray(statement) ? statement : statement.content;
    const heading = root[0];
    expect(heading).toMatchObject({ type: "heading", level: "Section" });
  });
});
