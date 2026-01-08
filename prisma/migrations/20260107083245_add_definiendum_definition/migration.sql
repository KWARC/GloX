-- CreateTable
CREATE TABLE "Definiendum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "futureRepo" TEXT NOT NULL DEFAULT 'Glox',
    "filePath" TEXT NOT NULL DEFAULT 'Glox',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Definiendum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Definition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "concept" TEXT NOT NULL DEFAULT 'Glox',
    "archive" TEXT NOT NULL DEFAULT 'Glox',
    "filePath" TEXT NOT NULL DEFAULT 'Glox',
    "fileName" TEXT NOT NULL DEFAULT 'Glox',
    "definiendumId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Definition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Definiendum_name_futureRepo_key" ON "Definiendum"("name", "futureRepo");

-- CreateIndex
CREATE INDEX "Definition_definiendumId_idx" ON "Definition"("definiendumId");

-- AddForeignKey
ALTER TABLE "Definition" ADD CONSTRAINT "Definition_definiendumId_fkey" FOREIGN KEY ("definiendumId") REFERENCES "Definiendum"("id") ON DELETE CASCADE ON UPDATE CASCADE;
