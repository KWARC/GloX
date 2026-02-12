/*
  Warnings:

  - You are about to drop the `Definiendum` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DefinitionDefiniendum` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DefinitionDefiniendum" DROP CONSTRAINT "DefinitionDefiniendum_definiendumId_fkey";

-- DropForeignKey
ALTER TABLE "DefinitionDefiniendum" DROP CONSTRAINT "DefinitionDefiniendum_definitionId_fkey";

-- DropForeignKey
ALTER TABLE "SymbolicReference" DROP CONSTRAINT "SymbolicReference_definiendumId_fkey";

-- DropTable
DROP TABLE "Definiendum";

-- DropTable
DROP TABLE "DefinitionDefiniendum";

-- CreateTable
CREATE TABLE "Symbol" (
    "id" TEXT NOT NULL,
    "symbolName" TEXT NOT NULL,
    "alias" TEXT,
    "futureRepo" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "resolvedUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Symbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefinitionSymbol" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "symbolId" TEXT NOT NULL,
    "isDeclared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefinitionSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Symbol_symbolName_idx" ON "Symbol"("symbolName");

-- CreateIndex
CREATE INDEX "Symbol_resolvedUri_idx" ON "Symbol"("resolvedUri");

-- CreateIndex
CREATE UNIQUE INDEX "Symbol_symbolName_futureRepo_filePath_fileName_language_key" ON "Symbol"("symbolName", "futureRepo", "filePath", "fileName", "language");

-- CreateIndex
CREATE INDEX "DefinitionSymbol_definitionId_idx" ON "DefinitionSymbol"("definitionId");

-- CreateIndex
CREATE INDEX "DefinitionSymbol_symbolId_idx" ON "DefinitionSymbol"("symbolId");

-- CreateIndex
CREATE UNIQUE INDEX "DefinitionSymbol_definitionId_symbolId_key" ON "DefinitionSymbol"("definitionId", "symbolId");

-- AddForeignKey
ALTER TABLE "SymbolicReference" ADD CONSTRAINT "SymbolicReference_definiendumId_fkey" FOREIGN KEY ("definiendumId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefinitionSymbol" ADD CONSTRAINT "DefinitionSymbol_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefinitionSymbol" ADD CONSTRAINT "DefinitionSymbol_symbolId_fkey" FOREIGN KEY ("symbolId") REFERENCES "Symbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
