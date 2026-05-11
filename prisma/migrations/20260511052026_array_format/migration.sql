/*
  Warnings:

  - The `definienda` column on the `LlmSuggestedDefinienda` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "LlmSuggestedDefinienda" DROP COLUMN "definienda",
ADD COLUMN     "definienda" TEXT[];
