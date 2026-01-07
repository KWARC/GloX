-- DropIndex
DROP INDEX "Definiendum_name_futureRepo_key";

-- CreateIndex
CREATE INDEX "Definiendum_name_idx" ON "Definiendum"("name");

-- CreateIndex
CREATE INDEX "Definiendum_futureRepo_idx" ON "Definiendum"("futureRepo");

-- CreateIndex
CREATE INDEX "Definition_archive_filePath_fileName_concept_idx" ON "Definition"("archive", "filePath", "fileName", "concept");
