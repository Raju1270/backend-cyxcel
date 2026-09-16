-- CreateEnum
CREATE TYPE "ControlQuestionType" AS ENUM ('SINGLE_LINE', 'SECTION_WITH_SUBPARTS');

-- AlterTable: every existing Control row is a plain question+source pair, so
-- SINGLE_LINE is the correct default/backfill for all of them - no data
-- migration needed beyond the column default.
ALTER TABLE "Control" ADD COLUMN "type" "ControlQuestionType" NOT NULL DEFAULT 'SINGLE_LINE';
ALTER TABLE "Control" ADD COLUMN "introText" TEXT;
ALTER TABLE "Control" ADD COLUMN "subParts" JSONB;
