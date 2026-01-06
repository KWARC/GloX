/*
  Warnings:

  - You are about to drop the column `extractedText` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "extractedText";

-- CreateTable
CREATE TABLE "DocumentPage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentPage_documentId_idx" ON "DocumentPage"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPage_documentId_pageNumber_key" ON "DocumentPage"("documentId", "pageNumber");

-- AddForeignKey
ALTER TABLE "DocumentPage" ADD CONSTRAINT "DocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
