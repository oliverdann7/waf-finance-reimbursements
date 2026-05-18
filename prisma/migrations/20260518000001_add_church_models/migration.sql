-- CreateEnum
CREATE TYPE "ChurchReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Church" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Church_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchMonthlyFinancialReport" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ChurchReportStatus" NOT NULL DEFAULT 'DRAFT',
    "totalTithe" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpecialOfferings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fundBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionGC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionMENA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionWAF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionLocal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionOther" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributionTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priorMonthBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeposits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reconciliationNotes" TEXT NOT NULL DEFAULT '',
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "submissionDate" TIMESTAMP(3),
    "approvalDate" TIMESTAMP(3),
    "submittedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchMonthlyFinancialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitheOfferingDetail" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TitheOfferingDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'other',
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChurchDistributionConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "percentage" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchDistributionConfig_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "churchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Church_code_key" ON "Church"("code");

-- CreateIndex
CREATE INDEX "User_churchId_idx" ON "User"("churchId");

-- CreateIndex
CREATE INDEX "ChurchMonthlyFinancialReport_churchId_idx" ON "ChurchMonthlyFinancialReport"("churchId");

-- CreateIndex
CREATE INDEX "ChurchMonthlyFinancialReport_status_idx" ON "ChurchMonthlyFinancialReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchMonthlyFinancialReport_churchId_month_year_key" ON "ChurchMonthlyFinancialReport"("churchId", "month", "year");

-- CreateIndex
CREATE INDEX "TitheOfferingDetail_reportId_idx" ON "TitheOfferingDetail"("reportId");

-- CreateIndex
CREATE INDEX "ChurchReportAttachment_reportId_idx" ON "ChurchReportAttachment"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ChurchDistributionConfig_key_key" ON "ChurchDistributionConfig"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchMonthlyFinancialReport" ADD CONSTRAINT "ChurchMonthlyFinancialReport_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitheOfferingDetail" ADD CONSTRAINT "TitheOfferingDetail_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ChurchMonthlyFinancialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchReportAttachment" ADD CONSTRAINT "ChurchReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ChurchMonthlyFinancialReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
