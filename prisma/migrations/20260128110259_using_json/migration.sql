/*
  Warnings:

  - Changed the type of `statement` on the `Definition` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Definition" DROP COLUMN "statement",
ADD COLUMN     "statement" JSONB NOT NULL;
