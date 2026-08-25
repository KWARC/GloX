import { describe, expect, it } from "vitest";
import {
  ModuleDescriptionTexBulkExportError,
  ModuleDescriptionTexExportError,
} from "./moduleDescriptionTexExport";

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
    expect(error.toFailure()).toEqual({
      moduleId: "121455",
      phase: "definition approach",
      message: error.message,
    });
  });
});

describe("ModuleDescriptionTexBulkExportError", () => {
  it("lists every failed module in the message", () => {
    const error = new ModuleDescriptionTexBulkExportError(
      [
        {
          moduleId: "121455",
          phase: "definition approach",
          message: "Module 121455 (definition approach): first error",
        },
        {
          moduleId: "33994",
          phase: "module file",
          message: "Module 33994 (module file): second error",
        },
      ],
      12,
    );

    expect(error.message).toBe(
      [
        "2 module descriptions failed to export:",
        "- Module 121455 (definition approach): first error",
        "- Module 33994 (module file): second error",
      ].join("\n"),
    );
    expect(error.partialSuccess).toBe(true);
  });
});
