-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('EXTRACTED', 'FINALIZED', 'SUBMITTED_TO_MATHHUB');

-- AlterTable
ALTER TABLE "Document"
ADD COLUMN     "moduleDescription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indexStatus" "IndexStatus";

-- CreateIndex
CREATE INDEX "Document_moduleDescription_idx" ON "Document"("moduleDescription");

-- CreateIndex
CREATE INDEX "Document_indexStatus_idx" ON "Document"("indexStatus");
