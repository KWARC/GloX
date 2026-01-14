/*
  Warnings:

  - You are about to drop the column `symbolicReferenceId` on the `Definition` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SymbolicRefSource" AS ENUM ('MATHHUB', 'DEFINIENDUM');

-- DropForeignKey
ALTER TABLE "Definition" DROP CONSTRAINT "Definition_symbolicReferenceId_fkey";

-- DropIndex
DROP INDEX "Definition_documentId_pageNumber_idx";

-- DropIndex
DROP INDEX "Definition_symbolicReferenceId_idx";

-- AlterTable
ALTER TABLE "Definition" DROP COLUMN "symbolicReferenceId";

-- AlterTable
ALTER TABLE "SymbolicReference" ALTER COLUMN "conceptUri" DROP DEFAULT,
ALTER COLUMN "archive" DROP DEFAULT,
ALTER COLUMN "filePath" DROP DEFAULT,
ALTER COLUMN "fileName" DROP DEFAULT;

-- CreateTable
CREATE TABLE "DefinitionSymbolicRef" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "symbolicReferenceId" TEXT NOT NULL,
    "source" "SymbolicRefSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefinitionSymbolicRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefinitionSymbolicRef_definitionId_idx" ON "DefinitionSymbolicRef"("definitionId");

-- CreateIndex
CREATE INDEX "DefinitionSymbolicRef_symbolicReferenceId_idx" ON "DefinitionSymbolicRef"("symbolicReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "DefinitionSymbolicRef_definitionId_symbolicReferenceId_key" ON "DefinitionSymbolicRef"("definitionId", "symbolicReferenceId");

-- AddForeignKey
ALTER TABLE "DefinitionSymbolicRef" ADD CONSTRAINT "DefinitionSymbolicRef_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefinitionSymbolicRef" ADD CONSTRAINT "DefinitionSymbolicRef_symbolicReferenceId_fkey" FOREIGN KEY ("symbolicReferenceId") REFERENCES "SymbolicReference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
