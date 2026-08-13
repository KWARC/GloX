-- Add declaredSymbols column (no legacy backfill — new data uses create/update paths)
ALTER TABLE "FloDownBlock" ADD COLUMN "declaredSymbols" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
