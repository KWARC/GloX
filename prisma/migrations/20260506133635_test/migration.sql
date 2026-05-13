-- CreateTable
CREATE TABLE "LlmSuggestedDefinienda" (
    "id" TEXT NOT NULL,
    "definienda" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmSuggestedDefinienda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmSuggestedDefinienda_definitionId_idx" ON "LlmSuggestedDefinienda"("definitionId");

-- AddForeignKey
ALTER TABLE "LlmSuggestedDefinienda" ADD CONSTRAINT "LlmSuggestedDefinienda_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
