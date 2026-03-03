-- CreateEnum
CREATE TYPE "LatexStatus" AS ENUM ('EXTRACTED', 'FINALIZED', 'SUBMITTED');

-- AlterTable
ALTER TABLE "LatexTable" ADD COLUMN     "status" "LatexStatus" NOT NULL DEFAULT 'EXTRACTED';
