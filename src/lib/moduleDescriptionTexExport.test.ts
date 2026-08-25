import { describe, expect, it } from "vitest";
import { ModuleDescriptionTexExportError } from "./moduleDescriptionTexExport";

describe("ModuleDescriptionTexExportError", () => {
  it("includes module id and phase in the message", () => {
    const error = new ModuleDescriptionTexExportError(
      "121455",
      "definition approach",
      new Error("data did not match any variant of untagged enum InlineInDefinition"),
    );

    expect(error.message).toBe(
      "Module 121455 (definition approach): data did not match any variant of untagged enum InlineInDefinition",
    );
    expect(error.moduleId).toBe("121455");
    expect(error.phase).toBe("definition approach");
  });
});
