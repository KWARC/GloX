CREATE TYPE "ParagraphKind" AS ENUM (
    'Definition',
    'Assertion',
    'Paragraph',
    'Proof',
    'SubProof',
    'Example'
);

ALTER TABLE "Definition"
ADD COLUMN "kind" "ParagraphKind" NOT NULL DEFAULT 'Definition';
