-- Drop unique constraint on replacedById to allow multiple inactive questions to reference the same active question
DROP INDEX IF EXISTS "Question_replacedById_key";
