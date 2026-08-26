export type GloxDocumentIdentity = {
  futureRepo: string;
  filePath: string;
  language: string;
};

export type GloxBlockIdentity = GloxDocumentIdentity & {
  fileName: string;
};

const DOCUMENT_IDENTITY_FIELDS = [
  "futureRepo",
  "filePath",
  "language",
] as const satisfies readonly (keyof GloxDocumentIdentity)[];

const BLOCK_IDENTITY_FIELDS = [
  "futureRepo",
  "filePath",
  "fileName",
  "language",
] as const satisfies readonly (keyof GloxBlockIdentity)[];

/** Bracketed field values for UI, e.g. ["courses/FAU/...", "smglom/cs", "en"]. */
export function gloxIdentityDisplayFields(
  identity: GloxDocumentIdentity | GloxBlockIdentity,
): string[] {
  if ("fileName" in identity && identity.fileName !== undefined) {
    return BLOCK_IDENTITY_FIELDS.map((key) => identity[key]);
  }

  return DOCUMENT_IDENTITY_FIELDS.map((key) => identity[key]);
}

/** Single-line label matching ExtractedTextList / LatexConfigModel convention. */
export function formatGloxBlockIdentity(identity: GloxBlockIdentity): string {
  return gloxIdentityDisplayFields(identity)
    .map((field) => `[${field}]`)
    .join(" ");
}
