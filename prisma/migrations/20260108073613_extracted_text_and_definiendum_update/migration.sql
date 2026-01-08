/*
  Warnings:

  - You are about to drop the column `name` on the `Definiendum` table. All the data in the column will be lost.
  - Added the required column `symbolName` to the `Definiendum` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Definiendum_name_idx";

-- AlterTable
ALTER TABLE "Definiendum" DROP COLUMN "name",
ADD COLUMN     "alias" TEXT,
ADD COLUMN     "symbolDeclared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "symbolName" TEXT NOT NULL,
ALTER COLUMN "futureRepo" DROP DEFAULT,
ALTER COLUMN "filePath" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ExtractedText" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentPageId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "originalText" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "futureRepo" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractedText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtractedText_documentId_idx" ON "ExtractedText"("documentId");

-- CreateIndex
CREATE INDEX "ExtractedText_documentPageId_idx" ON "ExtractedText"("documentPageId");

-- CreateIndex
CREATE INDEX "ExtractedText_documentId_pageNumber_idx" ON "ExtractedText"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "ExtractedText_futureRepo_filePath_idx" ON "ExtractedText"("futureRepo", "filePath");

-- CreateIndex
CREATE INDEX "Definiendum_symbolName_idx" ON "Definiendum"("symbolName");

-- AddForeignKey
ALTER TABLE "ExtractedText" ADD CONSTRAINT "ExtractedText_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedText" ADD CONSTRAINT "ExtractedText_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
