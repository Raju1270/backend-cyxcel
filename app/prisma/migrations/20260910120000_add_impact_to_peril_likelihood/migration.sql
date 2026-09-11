-- AlterTable: add nullable first so the backfill below can run against a
-- populated table, then enforce NOT NULL once every row has a value.
ALTER TABLE "PerilLikelihood" ADD COLUMN "impact" "Impact";

-- Backfill: before this migration, severity was a single current value on
-- Peril rather than dated per month, so the best available guess for every
-- existing PerilLikelihood row is that peril's current impact. '2' (MODERATE
-- - see the Impact enum's @map("2") in schema.prisma; the DB stores these
-- numerically, Prisma Client translates to/from the friendly names) is the
-- fallback for the rare peril with no impact set at all.
UPDATE "PerilLikelihood" pl
SET "impact" = COALESCE(p."impact", '2')
FROM "Peril" p
WHERE p.id = pl."perilId";

ALTER TABLE "PerilLikelihood" ALTER COLUMN "impact" SET NOT NULL;
