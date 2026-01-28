/*
  Warnings:

  - You are about to drop the column `definiendumId` on the `Definition` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Definition" DROP CONSTRAINT "Definition_definiendumId_fkey";

-- DropIndex
DROP INDEX "Definition_definiendumId_idx";

-- AlterTable
ALTER TABLE "Definition" DROP COLUMN "definiendumId";

-- CreateTable
CREATE TABLE "DefinitionDefiniendum" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "definiendumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefinitionDefiniendum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DefinitionDefiniendum_definitionId_idx" ON "DefinitionDefiniendum"("definitionId");

-- CreateIndex
CREATE INDEX "DefinitionDefiniendum_definiendumId_idx" ON "DefinitionDefiniendum"("definiendumId");

-- CreateIndex
CREATE UNIQUE INDEX "DefinitionDefiniendum_definitionId_definiendumId_key" ON "DefinitionDefiniendum"("definitionId", "definiendumId");

-- AddForeignKey
ALTER TABLE "DefinitionDefiniendum" ADD CONSTRAINT "DefinitionDefiniendum_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefinitionDefiniendum" ADD CONSTRAINT "DefinitionDefiniendum_definiendumId_fkey" FOREIGN KEY ("definiendumId") REFERENCES "Definiendum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
