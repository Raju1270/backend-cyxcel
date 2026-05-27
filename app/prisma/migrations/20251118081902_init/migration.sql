-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "Likelihood" AS ENUM('HIGHLY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'HIGHLY_LIKELY');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "Impact" AS ENUM('MINOR', 'MODERATE', 'MAJOR', 'SEVERE', 'CRITICAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "SectorRole" AS ENUM('producer', 'producerIntermediary', 'intermediary', 'intermediaryEndUser', 'enabler', 'endUser');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "Exposure" AS ENUM('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "Region" AS ENUM('EU', 'US', 'UK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
 CREATE TYPE "ScopingAnswer" AS ENUM('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Peril" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "Impact",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Peril_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PerilLikelihood" (
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
CREATE TABLE IF NOT EXISTS "RiskCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lossData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sector" (
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
CREATE TABLE IF NOT EXISTS "SectorExposure" (
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
CREATE TABLE IF NOT EXISTS "NatureOfLoss" (
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
CREATE TABLE IF NOT EXISTS "RiskOwner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
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
CREATE TABLE IF NOT EXISTS "UserSettings" (
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
CREATE TABLE IF NOT EXISTS "Report" (
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
CREATE TABLE IF NOT EXISTS "ThoughtLeadership" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "publishedDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThoughtLeadership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExposureQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExposureQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Question" (
    "id" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Service" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "riskCategoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomRiskCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRiskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_NatureOfLossToPeril" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_PerilToRegion" (
    "A" TEXT NOT NULL,
    "B" "Region" NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_PerilToRiskCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_CustomPerils" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "_NatureOfLossSecondaryOwners" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Peril_slug_key" ON "Peril"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RiskCategory_slug_key" ON "RiskCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NatureOfLoss_slug_key" ON "NatureOfLoss"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RiskOwner_name_key" ON "RiskOwner"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_settingsId_key" ON "User"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CustomRiskCategory_slug_key" ON "CustomRiskCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_NatureOfLossToPeril_AB_unique" ON "_NatureOfLossToPeril"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_NatureOfLossToPeril_B_index" ON "_NatureOfLossToPeril"("B");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_PerilToRegion_AB_unique" ON "_PerilToRegion"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_PerilToRegion_B_index" ON "_PerilToRegion"("B");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_PerilToRiskCategory_AB_unique" ON "_PerilToRiskCategory"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_PerilToRiskCategory_B_index" ON "_PerilToRiskCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_CustomPerils_AB_unique" ON "_CustomPerils"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_CustomPerils_B_index" ON "_CustomPerils"("B");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "_NatureOfLossSecondaryOwners_AB_unique" ON "_NatureOfLossSecondaryOwners"("A", "B");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_NatureOfLossSecondaryOwners_B_index" ON "_NatureOfLossSecondaryOwners"("B");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'PerilLikelihood_perilId_fkey'
    ) THEN
        ALTER TABLE "PerilLikelihood" ADD CONSTRAINT "PerilLikelihood_perilId_fkey" 
        FOREIGN KEY ("perilId") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'NatureOfLoss_primaryOwnerId_fkey'
    ) THEN
        ALTER TABLE "NatureOfLoss" ADD CONSTRAINT "NatureOfLoss_primaryOwnerId_fkey" 
        FOREIGN KEY ("primaryOwnerId") REFERENCES "RiskOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'User_settingsId_fkey'
    ) THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_settingsId_fkey" 
        FOREIGN KEY ("settingsId") REFERENCES "UserSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Report_riskCategoryId_fkey'
    ) THEN
        ALTER TABLE "Report" ADD CONSTRAINT "Report_riskCategoryId_fkey" 
        FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Report_userId_fkey'
    ) THEN
        ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ThoughtLeadership_riskCategoryId_fkey'
    ) THEN
        ALTER TABLE "ThoughtLeadership" ADD CONSTRAINT "ThoughtLeadership_riskCategoryId_fkey" 
        FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ExposureQuestion_riskCategoryId_fkey'
    ) THEN
        ALTER TABLE "ExposureQuestion" ADD CONSTRAINT "ExposureQuestion_riskCategoryId_fkey" 
        FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Question_riskCategoryId_fkey'
    ) THEN
        ALTER TABLE "Question" ADD CONSTRAINT "Question_riskCategoryId_fkey" 
        FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Service_riskCategoryId_fkey'
    ) THEN
        ALTER TABLE "Service" ADD CONSTRAINT "Service_riskCategoryId_fkey" 
        FOREIGN KEY ("riskCategoryId") REFERENCES "RiskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'CustomRiskCategory_userId_fkey'
    ) THEN
        ALTER TABLE "CustomRiskCategory" ADD CONSTRAINT "CustomRiskCategory_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'SectorExposure_sectorId_fkey'
    ) THEN
        ALTER TABLE "SectorExposure" ADD CONSTRAINT "SectorExposure_sectorId_fkey" 
        FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_NatureOfLossToPeril_A_fkey'
    ) THEN
        ALTER TABLE "_NatureOfLossToPeril" ADD CONSTRAINT "_NatureOfLossToPeril_A_fkey" 
        FOREIGN KEY ("A") REFERENCES "NatureOfLoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_NatureOfLossToPeril_B_fkey'
    ) THEN
        ALTER TABLE "_NatureOfLossToPeril" ADD CONSTRAINT "_NatureOfLossToPeril_B_fkey" 
        FOREIGN KEY ("B") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_PerilToRegion_A_fkey'
    ) THEN
        ALTER TABLE "_PerilToRegion" ADD CONSTRAINT "_PerilToRegion_A_fkey" 
        FOREIGN KEY ("A") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_PerilToRiskCategory_A_fkey'
    ) THEN
        ALTER TABLE "_PerilToRiskCategory" ADD CONSTRAINT "_PerilToRiskCategory_A_fkey" 
        FOREIGN KEY ("A") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_PerilToRiskCategory_B_fkey'
    ) THEN
        ALTER TABLE "_PerilToRiskCategory" ADD CONSTRAINT "_PerilToRiskCategory_B_fkey" 
        FOREIGN KEY ("B") REFERENCES "RiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_CustomPerils_A_fkey'
    ) THEN
        ALTER TABLE "_CustomPerils" ADD CONSTRAINT "_CustomPerils_A_fkey" 
        FOREIGN KEY ("A") REFERENCES "CustomRiskCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_CustomPerils_B_fkey'
    ) THEN
        ALTER TABLE "_CustomPerils" ADD CONSTRAINT "_CustomPerils_B_fkey" 
        FOREIGN KEY ("B") REFERENCES "Peril"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_NatureOfLossSecondaryOwners_A_fkey'
    ) THEN
        ALTER TABLE "_NatureOfLossSecondaryOwners" ADD CONSTRAINT "_NatureOfLossSecondaryOwners_A_fkey" 
        FOREIGN KEY ("A") REFERENCES "NatureOfLoss"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = '_NatureOfLossSecondaryOwners_B_fkey'
    ) THEN
        ALTER TABLE "_NatureOfLossSecondaryOwners" ADD CONSTRAINT "_NatureOfLossSecondaryOwners_B_fkey" 
        FOREIGN KEY ("B") REFERENCES "RiskOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

