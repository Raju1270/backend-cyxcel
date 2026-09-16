-- CreateEnum
CREATE TYPE "ControlSubPartsStyle" AS ENUM ('LETTERED', 'BULLET');

-- AlterTable: LETTERED matches the only style that's existed so far (a)/(b)/(c),
-- so it's the correct default/backfill for every existing Control row.
ALTER TABLE "Control" ADD COLUMN "subPartsStyle" "ControlSubPartsStyle" NOT NULL DEFAULT 'LETTERED';
