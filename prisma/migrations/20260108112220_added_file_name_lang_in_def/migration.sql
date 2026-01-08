/*
  Warnings:

  - You are about to drop the column `concept` on the `Definition` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Definition_archive_filePath_fileName_concept_idx";

-- DropIndex
DROP INDEX "ExtractedText_futureRepo_filePath_idx";

-- AlterTable
ALTER TABLE "Definition" DROP COLUMN "concept",
ADD COLUMN     "conceptUri" TEXT NOT NULL DEFAULT 'Glox',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "ExtractedText" ADD COLUMN     "fileName" TEXT NOT NULL DEFAULT 'Glox',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ALTER COLUMN "futureRepo" SET DEFAULT 'Glox',
ALTER COLUMN "filePath" SET DEFAULT 'Glox';

-- CreateIndex
CREATE INDEX "Definition_archive_filePath_fileName_conceptUri_language_idx" ON "Definition"("archive", "filePath", "fileName", "conceptUri", "language");

-- CreateIndex
CREATE INDEX "ExtractedText_futureRepo_filePath_fileName_language_idx" ON "ExtractedText"("futureRepo", "filePath", "fileName", "language");
