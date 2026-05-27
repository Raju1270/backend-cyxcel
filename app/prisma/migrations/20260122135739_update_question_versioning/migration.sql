-- Drop old foreign key and index
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_previousQuestionId_fkey";
DROP INDEX IF EXISTS "Question_previousQuestionId_key";

-- Drop old column
ALTER TABLE "Question" DROP COLUMN IF EXISTS "previousQuestionId";

-- Add new column for replacedById (inactive questions reference the active question that replaced them)
ALTER TABLE "Question" ADD COLUMN "replacedById" TEXT;

-- Create unique index (each inactive question can only be replaced by one active question)
CREATE UNIQUE INDEX IF NOT EXISTS "Question_replacedById_key" ON "Question"("replacedById");

-- Add foreign key constraint
ALTER TABLE "Question" ADD CONSTRAINT "Question_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
