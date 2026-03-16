-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "filePath" TEXT NOT NULL DEFAULT 'mod',
ADD COLUMN     "futureRepo" TEXT NOT NULL DEFAULT 'smglom/softeng',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';
