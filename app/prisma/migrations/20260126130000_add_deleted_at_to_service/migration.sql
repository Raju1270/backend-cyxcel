-- Add soft-delete support for Service
ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes for common query patterns (filter by category; exclude deleted)
CREATE INDEX "Service_riskCategoryId_idx"
  ON "Service"("riskCategoryId");

CREATE INDEX "Service_deletedAt_idx"
  ON "Service"("deletedAt");

