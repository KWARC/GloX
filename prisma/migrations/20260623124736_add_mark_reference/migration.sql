-- CreateTable
CREATE TABLE "markReference" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentPageId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "symbolName" TEXT NOT NULL,
    "verbalization" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "markReference_documentId_idx" ON "markReference"("documentId");

-- CreateIndex
CREATE INDEX "markReference_documentPageId_idx" ON "markReference"("documentPageId");

-- AddForeignKey
ALTER TABLE "markReference" ADD CONSTRAINT "markReference_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markReference" ADD CONSTRAINT "markReference_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markReference" ADD CONSTRAINT "markReference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
