-- CreateTable
CREATE TABLE "ModuleDescriptionFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleDescriptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleDescriptionFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleDescriptionFavorite_userId_idx" ON "ModuleDescriptionFavorite"("userId");

-- CreateIndex
CREATE INDEX "ModuleDescriptionFavorite_moduleDescriptionId_idx" ON "ModuleDescriptionFavorite"("moduleDescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleDescriptionFavorite_userId_moduleDescriptionId_key" ON "ModuleDescriptionFavorite"("userId", "moduleDescriptionId");

-- AddForeignKey
ALTER TABLE "ModuleDescriptionFavorite" ADD CONSTRAINT "ModuleDescriptionFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleDescriptionFavorite" ADD CONSTRAINT "ModuleDescriptionFavorite_moduleDescriptionId_fkey" FOREIGN KEY ("moduleDescriptionId") REFERENCES "ModuleDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
