-- Rename Definition -> FloDownBlock (aligns with FloDown addElement payload)
-- Drop redundant ParagraphKind column; block shape lives in statement JSON only.

-- Enum
ALTER TYPE "DefinitionStatus" RENAME TO "FloDownBlockStatus";

-- Tables
ALTER TABLE "Definition" RENAME TO "FloDownBlock";
ALTER TABLE "DefinitionVersion" RENAME TO "FloDownBlockVersion";

-- Foreign-key columns
ALTER TABLE "FloDownBlockVersion" RENAME COLUMN "definitionId" TO "floDownBlockId";
ALTER TABLE "LlmSuggestedDefinienda" RENAME COLUMN "definitionId" TO "floDownBlockId";
ALTER TABLE "DefinitionSymbolicRef" RENAME COLUMN "definitionId" TO "floDownBlockId";

-- Primary keys
ALTER TABLE "FloDownBlock" RENAME CONSTRAINT "Definition_pkey" TO "FloDownBlock_pkey";
ALTER TABLE "FloDownBlockVersion" RENAME CONSTRAINT "DefinitionVersion_pkey" TO "FloDownBlockVersion_pkey";

-- FloDownBlock indexes
ALTER INDEX "Definition_documentPageId_idx" RENAME TO "FloDownBlock_documentPageId_idx";
ALTER INDEX "Definition_documentId_idx" RENAME TO "FloDownBlock_documentId_idx";
ALTER INDEX "Definition_futureRepo_filePath_fileName_language_idx" RENAME TO "FloDownBlock_futureRepo_filePath_fileName_language_idx";

-- FloDownBlock foreign keys
ALTER TABLE "FloDownBlock" RENAME CONSTRAINT "Definition_documentId_fkey" TO "FloDownBlock_documentId_fkey";
ALTER TABLE "FloDownBlock" RENAME CONSTRAINT "Definition_documentPageId_fkey" TO "FloDownBlock_documentPageId_fkey";
ALTER TABLE "FloDownBlock" RENAME CONSTRAINT "Definition_createdById_fkey" TO "FloDownBlock_createdById_fkey";
ALTER TABLE "FloDownBlock" RENAME CONSTRAINT "Definition_updatedById_fkey" TO "FloDownBlock_updatedById_fkey";

-- FloDownBlockVersion indexes and constraints
ALTER INDEX "DefinitionVersion_definitionId_idx" RENAME TO "FloDownBlockVersion_floDownBlockId_idx";
ALTER INDEX "DefinitionVersion_definitionId_versionNumber_key" RENAME TO "FloDownBlockVersion_floDownBlockId_versionNumber_key";
ALTER TABLE "FloDownBlockVersion" RENAME CONSTRAINT "DefinitionVersion_definitionId_fkey" TO "FloDownBlockVersion_floDownBlockId_fkey";
ALTER TABLE "FloDownBlockVersion" RENAME CONSTRAINT "DefinitionVersion_editedById_fkey" TO "FloDownBlockVersion_editedById_fkey";

-- LlmSuggestedDefinienda
ALTER INDEX "LlmSuggestedDefinienda_definitionId_idx" RENAME TO "LlmSuggestedDefinienda_floDownBlockId_idx";
ALTER TABLE "LlmSuggestedDefinienda" RENAME CONSTRAINT "LlmSuggestedDefinienda_definitionId_fkey" TO "LlmSuggestedDefinienda_floDownBlockId_fkey";

-- DefinitionSymbolicRef (deprecated table — column rename only)
ALTER INDEX "DefinitionSymbolicRef_definitionId_idx" RENAME TO "DefinitionSymbolicRef_floDownBlockId_idx";
ALTER INDEX "DefinitionSymbolicRef_definitionId_symbolicReferenceId_key" RENAME TO "DefinitionSymbolicRef_floDownBlockId_symbolicReferenceId_key";
ALTER TABLE "DefinitionSymbolicRef" RENAME CONSTRAINT "DefinitionSymbolicRef_definitionId_fkey" TO "DefinitionSymbolicRef_floDownBlockId_fkey";

-- Normalize legacy non-Definition rows: unwrap definition wrapper to top-level paragraph block
UPDATE "FloDownBlock"
SET "statement" = jsonb_build_object(
  'type', 'paragraph',
  'content', COALESCE(
    "statement"->'content'->0->'content',
    "statement"->'content',
    '[]'::jsonb
  )
)
WHERE "kind"::text != 'Definition'
  AND "statement"->>'type' = 'definition';

ALTER TABLE "FloDownBlock" DROP COLUMN "kind";
DROP TYPE "ParagraphKind";
