-- CreateTable
CREATE TABLE "LlmSuggestion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "customPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmSuggestedDefinition" (
    "id" TEXT NOT NULL,
    "llmSuggestionId" TEXT NOT NULL,
    "documentPageId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "suggestions" JSONB NOT NULL,
    "definitionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmSuggestedDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmSuggestion_documentId_idx" ON "LlmSuggestion"("documentId");

-- CreateIndex
CREATE INDEX "LlmSuggestedDefinition_documentPageId_idx" ON "LlmSuggestedDefinition"("documentPageId");

-- CreateIndex
CREATE UNIQUE INDEX "LlmSuggestedDefinition_llmSuggestionId_documentPageId_key" ON "LlmSuggestedDefinition"("llmSuggestionId", "documentPageId");

-- AddForeignKey
ALTER TABLE "LlmSuggestion" ADD CONSTRAINT "LlmSuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmSuggestedDefinition" ADD CONSTRAINT "LlmSuggestedDefinition_llmSuggestionId_fkey" FOREIGN KEY ("llmSuggestionId") REFERENCES "LlmSuggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmSuggestedDefinition" ADD CONSTRAINT "LlmSuggestedDefinition_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
