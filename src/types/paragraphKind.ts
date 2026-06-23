export const PARAGRAPH_KINDS = [
  "Definition",
  "Assertion",
  "Paragraph",
  "Proof",
  "SubProof",
  "Example",
] as const;

export type ParagraphKind = (typeof PARAGRAPH_KINDS)[number];

export function supportsDefinienda(kind: ParagraphKind): boolean {
  return kind === "Definition";
}
