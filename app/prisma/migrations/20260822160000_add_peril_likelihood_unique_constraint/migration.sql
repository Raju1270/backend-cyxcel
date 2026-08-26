-- DropIndex (the old non-unique index, if it was ever actually applied)
DROP INDEX IF EXISTS "PerilLikelihood_perilId_createdAt_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PerilLikelihood_perilId_createdAt_key" ON "PerilLikelihood"("perilId", "createdAt");
