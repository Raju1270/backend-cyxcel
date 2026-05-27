-- AlterTable
ALTER TABLE "Question" ADD COLUMN "previousQuestionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Question_previousQuestionId_key" ON "Question"("previousQuestionId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_previousQuestionId_fkey" FOREIGN KEY ("previousQuestionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
