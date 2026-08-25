-- Snapshot columns for statement JSON before opaque-URI backfill.

ALTER TABLE "FloDownBlock" ADD COLUMN "statement_bkp" JSONB;

ALTER TABLE "ModuleDescription" ADD COLUMN "titleStatement_bkp" JSONB;
ALTER TABLE "ModuleDescription" ADD COLUMN "inhaltStatement_bkp" JSONB;
ALTER TABLE "ModuleDescription" ADD COLUMN "lernzieleStatement_bkp" JSONB;
