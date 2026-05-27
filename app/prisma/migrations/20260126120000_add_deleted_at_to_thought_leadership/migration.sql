-- Add soft-delete support for ThoughtLeadership
ALTER TABLE "ThoughtLeadership" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes for common query patterns (list/filter by category + date; exclude deleted)
CREATE INDEX "ThoughtLeadership_riskCategoryId_publishedDate_idx"
  ON "ThoughtLeadership"("riskCategoryId", "publishedDate");

CREATE INDEX "ThoughtLeadership_deletedAt_idx"
  ON "ThoughtLeadership"("deletedAt");

