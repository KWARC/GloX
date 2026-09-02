-- AlterTable
ALTER TABLE "ModuleDescription" ADD COLUMN "duplicateOfModuleId" TEXT;

-- CreateIndex
CREATE INDEX "ModuleDescription_duplicateOfModuleId_idx" ON "ModuleDescription"("duplicateOfModuleId");

-- AddForeignKey
ALTER TABLE "ModuleDescription" ADD CONSTRAINT "ModuleDescription_duplicateOfModuleId_fkey" FOREIGN KEY ("duplicateOfModuleId") REFERENCES "ModuleDescription"("moduleId") ON DELETE RESTRICT ON UPDATE CASCADE;
