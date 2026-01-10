/*
  Warnings:

  - You are about to drop the column `archive` on the `Definition` table. All the data in the column will be lost.
  - You are about to drop the column `conceptUri` on the `Definition` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Definition` table. All the data in the column will be lost.
  - You are about to drop the `ExtractedText` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `documentId` to the `Definition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentPageId` to the `Definition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalText` to the `Definition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pageNumber` to the `Definition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statement` to the `Definition` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Definition" DROP CONSTRAINT "Definition_definiendumId_fkey";

-- DropForeignKey
ALTER TABLE "ExtractedText" DROP CONSTRAINT "ExtractedText_documentId_fkey";

-- DropForeignKey
ALTER TABLE "ExtractedText" DROP CONSTRAINT "ExtractedText_documentPageId_fkey";

-- DropIndex
DROP INDEX "Definition_archive_filePath_fileName_conceptUri_language_idx";

-- AlterTable
ALTER TABLE "Definition" DROP COLUMN "archive",
DROP COLUMN "conceptUri",
DROP COLUMN "name",
ADD COLUMN     "documentId" TEXT NOT NULL,
ADD COLUMN     "documentPageId" TEXT NOT NULL,
ADD COLUMN     "futureRepo" TEXT NOT NULL DEFAULT 'Glox',
ADD COLUMN     "originalText" TEXT NOT NULL,
ADD COLUMN     "pageNumber" INTEGER NOT NULL,
ADD COLUMN     "statement" TEXT NOT NULL,
ADD COLUMN     "symbolicReferenceId" TEXT;

-- DropTable
DROP TABLE "ExtractedText";

-- CreateTable
CREATE TABLE "SymbolicReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conceptUri" TEXT NOT NULL DEFAULT 'Glox',
    "archive" TEXT NOT NULL DEFAULT 'Glox',
    "filePath" TEXT NOT NULL DEFAULT 'Glox',
    "fileName" TEXT NOT NULL DEFAULT 'Glox',
    "language" TEXT NOT NULL DEFAULT 'en',
    "definiendumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SymbolicReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LatexTable" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "finalLatex" TEXT NOT NULL,
    "history" JSONB NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatexTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SymbolicReference_definiendumId_idx" ON "SymbolicReference"("definiendumId");

-- CreateIndex
CREATE INDEX "SymbolicReference_archive_filePath_fileName_conceptUri_lang_idx" ON "SymbolicReference"("archive", "filePath", "fileName", "conceptUri", "language");

-- CreateIndex
CREATE INDEX "LatexTable_definitionId_idx" ON "LatexTable"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "LatexTable_definitionId_key" ON "LatexTable"("definitionId");

-- CreateIndex
CREATE INDEX "Definition_documentId_idx" ON "Definition"("documentId");

-- CreateIndex
CREATE INDEX "Definition_documentPageId_idx" ON "Definition"("documentPageId");

-- CreateIndex
CREATE INDEX "Definition_documentId_pageNumber_idx" ON "Definition"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "Definition_symbolicReferenceId_idx" ON "Definition"("symbolicReferenceId");

-- CreateIndex
CREATE INDEX "Definition_futureRepo_filePath_fileName_language_idx" ON "Definition"("futureRepo", "filePath", "fileName", "language");

-- AddForeignKey
ALTER TABLE "SymbolicReference" ADD CONSTRAINT "SymbolicReference_definiendumId_fkey" FOREIGN KEY ("definiendumId") REFERENCES "Definiendum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Definition" ADD CONSTRAINT "Definition_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Definition" ADD CONSTRAINT "Definition_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Definition" ADD CONSTRAINT "Definition_symbolicReferenceId_fkey" FOREIGN KEY ("symbolicReferenceId") REFERENCES "SymbolicReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Definition" ADD CONSTRAINT "Definition_definiendumId_fkey" FOREIGN KEY ("definiendumId") REFERENCES "Definiendum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LatexTable" ADD CONSTRAINT "LatexTable_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
