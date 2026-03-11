-- AlterEnum
ALTER TYPE "DefinitionStatus" ADD VALUE 'DISCARDED';

-- AlterTable
ALTER TABLE "Definition" ADD COLUMN     "discardedReason" TEXT,
ALTER COLUMN "filePath" SET DEFAULT 'mod',
ALTER COLUMN "futureRepo" SET DEFAULT 'smglom/Glox';
