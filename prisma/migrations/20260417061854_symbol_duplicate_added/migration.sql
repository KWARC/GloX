-- AlterTable
ALTER TABLE "Symbol" ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "hasConfirmed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Symbol_confirmedById_idx" ON "Symbol"("confirmedById");

-- AddForeignKey
ALTER TABLE "Symbol" ADD CONSTRAINT "Symbol_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
