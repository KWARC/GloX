-- AlterTable
ALTER TABLE "Definiendum" ALTER COLUMN "resolvedUri" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Definiendum_resolvedUri_idx" ON "Definiendum"("resolvedUri");
