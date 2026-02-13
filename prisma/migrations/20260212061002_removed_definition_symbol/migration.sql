/*
  Warnings:

  - You are about to drop the column `resolvedUri` on the `Symbol` table. All the data in the column will be lost.
  - You are about to drop the `DefinitionSymbol` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DefinitionSymbol" DROP CONSTRAINT "DefinitionSymbol_definitionId_fkey";

-- DropForeignKey
ALTER TABLE "DefinitionSymbol" DROP CONSTRAINT "DefinitionSymbol_symbolId_fkey";

-- DropIndex
DROP INDEX "Symbol_resolvedUri_idx";

-- AlterTable
ALTER TABLE "Symbol" DROP COLUMN "resolvedUri";

-- DropTable
DROP TABLE "DefinitionSymbol";
