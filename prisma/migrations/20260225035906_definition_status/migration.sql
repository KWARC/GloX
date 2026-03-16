-- CreateEnum
CREATE TYPE "DefinitionStatus" AS ENUM ('EXTRACTED', 'FINALIZED_IN_FILE', 'SUBMITTED_TO_MATHHUB');

-- AlterTable
ALTER TABLE "Definition" ADD COLUMN     "status" "DefinitionStatus" NOT NULL DEFAULT 'EXTRACTED';
