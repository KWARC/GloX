/*
  Warnings:

  - You are about to drop the column `definitionId` on the `LatexTable` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[documentId,futureRepo,filePath,fileName,language]` on the table `LatexTable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `documentId` to the `LatexTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `LatexTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filePath` to the `LatexTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `futureRepo` to the `LatexTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `LatexTable` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LatexTable" DROP CONSTRAINT "LatexTable_definitionId_fkey";

-- DropIndex
DROP INDEX "LatexTable_definitionId_idx";

-- DropIndex
DROP INDEX "LatexTable_definitionId_key";

-- AlterTable
ALTER TABLE "LatexTable" DROP COLUMN "definitionId",
ADD COLUMN     "documentId" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "filePath" TEXT NOT NULL,
ADD COLUMN     "futureRepo" TEXT NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LatexTable_documentId_futureRepo_filePath_fileName_language_key" ON "LatexTable"("documentId", "futureRepo", "filePath", "fileName", "language");

-- AddForeignKey
ALTER TABLE "LatexTable" ADD CONSTRAINT "LatexTable_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
