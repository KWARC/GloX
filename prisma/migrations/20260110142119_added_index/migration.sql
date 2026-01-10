-- DropIndex
DROP INDEX "LatexTable_documentId_futureRepo_filePath_fileName_language_key";

-- CreateIndex
CREATE INDEX "LatexTable_documentId_futureRepo_filePath_fileName_language_idx" ON "LatexTable"("documentId", "futureRepo", "filePath", "fileName", "language");
