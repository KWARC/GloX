-- AlterTable
ALTER TABLE "FloDownBlock" ADD COLUMN     "moduleDescriptionId" TEXT,
ALTER COLUMN "documentId" DROP NOT NULL,
ALTER COLUMN "documentPageId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ModuleDescription" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "titleStatement" JSONB NOT NULL,
    "inhaltStatement" JSONB NOT NULL,
    "lernzieleStatement" JSONB NOT NULL,
    "futureRepo" TEXT NOT NULL DEFAULT 'courses/FAU/module-descriptions',
    "modulesFilePath" TEXT NOT NULL DEFAULT 'modules',
    "defsFilePath" TEXT NOT NULL DEFAULT 'defs',
    "language" TEXT NOT NULL DEFAULT 'de',
    "gloxifiedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleDescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleDescription_moduleId_key" ON "ModuleDescription"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleDescription_gloxifiedById_idx" ON "ModuleDescription"("gloxifiedById");

-- CreateIndex
CREATE INDEX "FloDownBlock_moduleDescriptionId_idx" ON "FloDownBlock"("moduleDescriptionId");

-- AddForeignKey
ALTER TABLE "ModuleDescription" ADD CONSTRAINT "ModuleDescription_gloxifiedById_fkey" FOREIGN KEY ("gloxifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloDownBlock" ADD CONSTRAINT "FloDownBlock_moduleDescriptionId_fkey" FOREIGN KEY ("moduleDescriptionId") REFERENCES "ModuleDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
