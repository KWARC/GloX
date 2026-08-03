-- AlterTable
ALTER TABLE "ModuleDescription" ADD COLUMN "indexStatus" "IndexStatus" NOT NULL DEFAULT 'EXTRACTED';

-- CreateIndex
CREATE INDEX "ModuleDescription_indexStatus_idx" ON "ModuleDescription"("indexStatus");
