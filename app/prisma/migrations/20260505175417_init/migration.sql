-- CreateEnum
CREATE TYPE "Likelihood" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('1', '2', '3', '4', '5');

-- CreateEnum
CREATE TYPE "SectorRole" AS ENUM ('producer', 'producerIntermediary', 'intermediary', 'intermediaryEndUser', 'enabler', 'endUser');

-- CreateEnum
CREATE TYPE "Exposure" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('EU', 'US', 'UK');

-- CreateEnum
CREATE TYPE "ScopingAnswer" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Peril" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "Impact",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "region" "Region"[],

    CONSTRAINT "Peril_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerilLikelihood" (
    "id" TEXT NOT NULL,
    "perilId" TEXT NOT NULL,
    "eu" "Likelihood" NOT NULL,
    "us" "Likelihood" NOT NULL,
    "uk" "Likelihood" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerilLikelihood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lossData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "SectorRole" NOT NULL,
    "euNS12" BOOLEAN NOT NULL,
    "euDORA" BOOLEAN NOT NULL,
    "uk" BOOLEAN NOT NULL,
    "usCISA" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorExposure" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "aiExposure" "Exposure" NOT NULL,
    "corporateResponsibilityExposure" "Exposure" NOT NULL,
    "cyberExposure" "Exposure" NOT NULL,
    "geopoliticalExposure" "Exposure" NOT NULL,
    "legalExposure" "Exposure" NOT NULL,
    "supplyChainExposure" "Exposure" NOT NULL,
    "technologyExposure" "Exposure" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectorExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NatureOfLoss" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "primaryOwnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NatureOfLoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT,
    "riskCategoryId" TEXT,
    "region" "Region",
    "riskOwnerId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopingAnswers" JSONB,
    "answers" JSONB,
    "riskCategoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThoughtLeadership" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ThoughtLeadership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExposureQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExposureQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inactive" BOOLEAN NOT NULL DEFAULT false,
    "replacedById" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRiskCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PerilToRiskCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PerilToRiskCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NatureOfLossSecondaryOwners" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NatureOfLossSecondaryOwners_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_NatureOfLossToPeril" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NatureOfLossToPeril_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CustomPerils" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomPerils_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Peril_slug_key" ON "Peril"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCategory_slug_key" ON "RiskCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NatureOfLoss_slug_key" ON "NatureOfLoss"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RiskOwner_name_key" ON "RiskOwner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_settingsId_key" ON "User"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "ThoughtLeadership_riskCategoryId_publishedDate_idx" ON "ThoughtLeadership"("riskCategoryId", "publishedDate");

-- CreateIndex
CREATE INDEX "ThoughtLeadership_deletedAt_idx" ON "ThoughtLeadership"("deletedAt");

-- CreateIndex
CREATE INDEX "Service_riskCategoryId_idx" ON "Service"("riskCategoryId");

-- CreateIndex
CREATE INDEX "Service_deletedAt_idx" ON "Service"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRiskCategory_slug_key" ON "CustomRiskCategory"("slug");

-- CreateIndex
CREATE INDEX "_PerilToRiskCategory_B_index" ON "_PerilToRiskCategory"("B");

-- CreateIndex
CREATE INDEX "_NatureOfLossSecondaryOwners_B_index" ON "_NatureOfLossSecondaryOwners"("B");

-- CreateIndex
CREATE INDEX "_NatureOfLossToPeril_B_index" ON "_NatureOfLossToPeril"("B");

-- CreateIndex
CREATE INDEX "_CustomPerils_B_index" ON "_CustomPerils"("B");

-- AddForeignKey
ALTER TABLE "PerilLikelihood" ADD CONSTRAINT "PerilLikelihood_perilId_fkey" FOREIGN KEY ("perilId") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorExposure" ADD CONSTRAINT "SectorExposure_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NatureOfLoss" ADD CONSTRAINT "NatureOfLoss_primaryOwnerId_fkey" FOREIGN KEY ("primaryOwnerId") REFERENCES "RiskOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "UserSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_riskCategoryId_fkey" FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThoughtLeadership" ADD CONSTRAINT "ThoughtLeadership_riskCategoryId_fkey" FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExposureQuestion" ADD CONSTRAINT "ExposureQuestion_riskCategoryId_fkey" FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_riskCategoryId_fkey" FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_riskCategoryId_fkey" FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRiskCategory" ADD CONSTRAINT "CustomRiskCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PerilToRiskCategory" ADD CONSTRAINT "_PerilToRiskCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PerilToRiskCategory" ADD CONSTRAINT "_PerilToRiskCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NatureOfLossSecondaryOwners" ADD CONSTRAINT "_NatureOfLossSecondaryOwners_A_fkey" FOREIGN KEY ("A") REFERENCES "NatureOfLoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NatureOfLossSecondaryOwners" ADD CONSTRAINT "_NatureOfLossSecondaryOwners_B_fkey" FOREIGN KEY ("B") REFERENCES "RiskOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NatureOfLossToPeril" ADD CONSTRAINT "_NatureOfLossToPeril_A_fkey" FOREIGN KEY ("A") REFERENCES "NatureOfLoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NatureOfLossToPeril" ADD CONSTRAINT "_NatureOfLossToPeril_B_fkey" FOREIGN KEY ("B") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomPerils" ADD CONSTRAINT "_CustomPerils_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomRiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomPerils" ADD CONSTRAINT "_CustomPerils_B_fkey" FOREIGN KEY ("B") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
