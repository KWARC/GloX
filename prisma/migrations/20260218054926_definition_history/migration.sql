-- AlterTable
ALTER TABLE "Definition" ADD COLUMN     "currentVersion" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "DefinitionVersion" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalText" TEXT NOT NULL,
    "statement" JSONB NOT NULL,
    "editedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefinitionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefinitionVersion_definitionId_idx" ON "DefinitionVersion"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "DefinitionVersion_definitionId_versionNumber_key" ON "DefinitionVersion"("definitionId", "versionNumber");

-- AddForeignKey
ALTER TABLE "DefinitionVersion" ADD CONSTRAINT "DefinitionVersion_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefinitionVersion" ADD CONSTRAINT "DefinitionVersion_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
