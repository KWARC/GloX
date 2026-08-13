-- Rename gloxifiedById -> createdById (preserves existing data)
ALTER TABLE "ModuleDescription" RENAME COLUMN "gloxifiedById" TO "createdById";

-- Rename index
ALTER INDEX "ModuleDescription_gloxifiedById_idx" RENAME TO "ModuleDescription_createdById_idx";

-- Rename foreign key constraint
ALTER TABLE "ModuleDescription" RENAME CONSTRAINT "ModuleDescription_gloxifiedById_fkey" TO "ModuleDescription_createdById_fkey";
