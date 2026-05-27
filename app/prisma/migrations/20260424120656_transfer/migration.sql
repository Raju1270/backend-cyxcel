/*
  Warnings:

  - The values [MINOR,MODERATE,MAJOR,SEVERE,CRITICAL] on the enum `Impact` will be removed. If these variants are still used in the database, this will fail.
  - The values [HIGHLY_UNLIKELY,UNLIKELY,POSSIBLE,LIKELY,HIGHLY_LIKELY] on the enum `Likelihood` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `_PerilToRegion` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Impact_new" AS ENUM ('1', '2', '3', '4', '5');
ALTER TABLE "Peril" ALTER COLUMN "impact" TYPE "Impact_new" USING ("impact"::text::"Impact_new");
ALTER TYPE "Impact" RENAME TO "Impact_old";
ALTER TYPE "Impact_new" RENAME TO "Impact";
DROP TYPE "public"."Impact_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Likelihood_new" AS ENUM ('1', '2', '3', '4', '5');
ALTER TABLE "PerilLikelihood" ALTER COLUMN "eu" TYPE "Likelihood_new" USING ("eu"::text::"Likelihood_new");
ALTER TABLE "PerilLikelihood" ALTER COLUMN "us" TYPE "Likelihood_new" USING ("us"::text::"Likelihood_new");
ALTER TABLE "PerilLikelihood" ALTER COLUMN "uk" TYPE "Likelihood_new" USING ("uk"::text::"Likelihood_new");
ALTER TYPE "Likelihood" RENAME TO "Likelihood_old";
ALTER TYPE "Likelihood_new" RENAME TO "Likelihood";
DROP TYPE "public"."Likelihood_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "_PerilToRegion" DROP CONSTRAINT "_PerilToRegion_A_fkey";

-- AlterTable
ALTER TABLE "Peril" ADD COLUMN     "region" "Region"[];

-- AlterTable
ALTER TABLE "_CustomPerils" ADD CONSTRAINT "_CustomPerils_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CustomPerils_AB_unique";

-- AlterTable
ALTER TABLE "_NatureOfLossSecondaryOwners" ADD CONSTRAINT "_NatureOfLossSecondaryOwners_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_NatureOfLossSecondaryOwners_AB_unique";

-- AlterTable
ALTER TABLE "_NatureOfLossToPeril" ADD CONSTRAINT "_NatureOfLossToPeril_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_NatureOfLossToPeril_AB_unique";

-- AlterTable
ALTER TABLE "_PerilToRiskCategory" ADD CONSTRAINT "_PerilToRiskCategory_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PerilToRiskCategory_AB_unique";

-- DropTable
DROP TABLE "_PerilToRegion";
