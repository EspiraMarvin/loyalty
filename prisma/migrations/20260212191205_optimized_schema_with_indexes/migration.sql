-- Optimized Schema Migration with Strategic Indexes and Join Tables
-- Created: 2026-02-12
-- Description: Baseline migration with performance optimizations including join tables for eligibility, rank fields, and strategic indexes

-- CreateTable: Review (no dependencies)
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Merchant
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Outlet
CREATE TABLE "Outlet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "merchantId" TEXT NOT NULL,
    "reviewId" TEXT,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CashbackConfiguration
CREATE TABLE "CashbackConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "merchantId" TEXT NOT NULL,
    "reviewId" TEXT,
    "netCashbackBudget" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "usedCashbackBudget" DECIMAL(65,30) NOT NULL DEFAULT 0.0,

    CONSTRAINT "CashbackConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExclusiveOffer
CREATE TABLE "ExclusiveOffer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "merchantId" TEXT,
    "reviewId" TEXT,
    "netOfferBudget" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "usedOfferBudget" DECIMAL(65,30) NOT NULL DEFAULT 0.0,

    CONSTRAINT "ExclusiveOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LoyaltyProgram
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "merchantId" TEXT,
    "reviewId" TEXT,
    "pointsUsedInPeriod" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "pointsIssuedLimit" DECIMAL(65,30),

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LoyaltyTier
CREATE TABLE "LoyaltyTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "minCustomerType" TEXT NOT NULL,
    "minRank" INTEGER NOT NULL,
    "loyaltyProgramId" TEXT NOT NULL,
    "reviewId" TEXT,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerType (with rank field)
CREATE TABLE "CustomerType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "CustomerType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaybillOrTill
CREATE TABLE "PaybillOrTill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "outletId" TEXT NOT NULL,
    "reviewId" TEXT,

    CONSTRAINT "PaybillOrTill_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CashbackConfigurationTier
CREATE TABLE "CashbackConfigurationTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "cashbackConfigurationId" TEXT NOT NULL,
    "reviewId" TEXT,

    CONSTRAINT "CashbackConfigurationTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MerchantLoyaltyReward
CREATE TABLE "MerchantLoyaltyReward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loyaltyProgramId" TEXT NOT NULL,
    "reviewId" TEXT,

    CONSTRAINT "MerchantLoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CashbackEligibleCustomerType (JOIN TABLE)
CREATE TABLE "CashbackEligibleCustomerType" (
    "id" TEXT NOT NULL,
    "cashbackConfigurationId" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,

    CONSTRAINT "CashbackEligibleCustomerType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExclusiveOfferEligibleCustomerType (JOIN TABLE)
CREATE TABLE "ExclusiveOfferEligibleCustomerType" (
    "id" TEXT NOT NULL,
    "exclusiveOfferId" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,

    CONSTRAINT "ExclusiveOfferEligibleCustomerType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Many-to-many join tables
CREATE TABLE "_CashbackConfigurationToOutlet" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE "_ExclusiveOfferToOutlet" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- ============================================================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "Outlet_reviewId_key" ON "Outlet"("reviewId");
CREATE UNIQUE INDEX "CashbackConfiguration_reviewId_key" ON "CashbackConfiguration"("reviewId");
CREATE UNIQUE INDEX "ExclusiveOffer_reviewId_key" ON "ExclusiveOffer"("reviewId");
CREATE UNIQUE INDEX "LoyaltyProgram_merchantId_key" ON "LoyaltyProgram"("merchantId");
CREATE UNIQUE INDEX "LoyaltyProgram_reviewId_key" ON "LoyaltyProgram"("reviewId");
CREATE UNIQUE INDEX "LoyaltyTier_reviewId_key" ON "LoyaltyTier"("reviewId");
CREATE UNIQUE INDEX "PaybillOrTill_reviewId_key" ON "PaybillOrTill"("reviewId");
CREATE UNIQUE INDEX "CashbackConfigurationTier_reviewId_key" ON "CashbackConfigurationTier"("reviewId");
CREATE UNIQUE INDEX "MerchantLoyaltyReward_reviewId_key" ON "MerchantLoyaltyReward"("reviewId");

-- Join table unique constraints
CREATE UNIQUE INDEX "CashbackEligibleCustomerType_cashbackConfigurationId_custom" ON "CashbackEligibleCustomerType"("cashbackConfigurationId", "customerType");
CREATE UNIQUE INDEX "ExclusiveOfferEligibleCustomerType_exclusiveOfferId_custom" ON "ExclusiveOfferEligibleCustomerType"("exclusiveOfferId", "customerType");
CREATE UNIQUE INDEX "_CashbackConfigurationToOutlet_AB_unique" ON "_CashbackConfigurationToOutlet"("A", "B");
CREATE UNIQUE INDEX "_ExclusiveOfferToOutlet_AB_unique" ON "_ExclusiveOfferToOutlet"("A", "B");

-- ============================================================================
-- CREATE STRATEGIC PERFORMANCE INDEXES
-- ============================================================================

-- Review indexes (frequently joined)
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- Merchant indexes (filtered by status and category)
CREATE INDEX "Merchant_status_category_idx" ON "Merchant"("status", "category");
CREATE INDEX "Merchant_status_idx" ON "Merchant"("status");

-- Outlet indexes (filtered by isActive, merchantId, reviewId)
CREATE INDEX "Outlet_isActive_merchantId_idx" ON "Outlet"("isActive", "merchantId");
CREATE INDEX "Outlet_merchantId_isActive_idx" ON "Outlet"("merchantId", "isActive");
CREATE INDEX "Outlet_reviewId_idx" ON "Outlet"("reviewId");

-- CashbackConfiguration indexes (filtered by merchantId, isActive, deletedAt)
CREATE INDEX "CashbackConfiguration_merchantId_isActive_idx" ON "CashbackConfiguration"("merchantId", "isActive");
CREATE INDEX "CashbackConfiguration_isActive_deletedAt_idx" ON "CashbackConfiguration"("isActive", "deletedAt");

-- ExclusiveOffer indexes (filtered by merchantId, isActive, deletedAt, date range)
CREATE INDEX "ExclusiveOffer_merchantId_isActive_idx" ON "ExclusiveOffer"("merchantId", "isActive");
CREATE INDEX "ExclusiveOffer_isActive_deletedAt_idx" ON "ExclusiveOffer"("isActive", "deletedAt");
CREATE INDEX "ExclusiveOffer_startDate_endDate_idx" ON "ExclusiveOffer"("startDate", "endDate");

-- LoyaltyProgram indexes (filtered by isActive, merchantId)
CREATE INDEX "LoyaltyProgram_isActive_merchantId_idx" ON "LoyaltyProgram"("isActive", "merchantId");
CREATE INDEX "LoyaltyProgram_reviewId_idx" ON "LoyaltyProgram"("reviewId");

-- LoyaltyTier indexes (filtered by loyaltyProgramId, isActive, minRank)
CREATE INDEX "LoyaltyTier_loyaltyProgramId_isActive_minRank_idx" ON "LoyaltyTier"("loyaltyProgramId", "isActive", "minRank");
CREATE INDEX "LoyaltyTier_isActive_deletedAt_idx" ON "LoyaltyTier"("isActive", "deletedAt");
CREATE INDEX "LoyaltyTier_minRank_isActive_idx" ON "LoyaltyTier"("minRank", "isActive");

-- CustomerType indexes (filtered by userId, merchantId, rank)
CREATE INDEX "CustomerType_userId_idx" ON "CustomerType"("userId");
CREATE INDEX "CustomerType_merchantId_userId_idx" ON "CustomerType"("merchantId", "userId");
CREATE INDEX "CustomerType_userId_rank_idx" ON "CustomerType"("userId", "rank");

-- PaybillOrTill indexes (filtered by outletId, isActive, deletedAt)
CREATE INDEX "PaybillOrTill_outletId_isActive_deletedAt_idx" ON "PaybillOrTill"("outletId", "isActive", "deletedAt");
CREATE INDEX "PaybillOrTill_isActive_deletedAt_idx" ON "PaybillOrTill"("isActive", "deletedAt");

-- CashbackConfigurationTier indexes (filtered by cashbackConfigurationId, isActive, percentage)
CREATE INDEX "CashbackConfigurationTier_cashbackConfigurationId_isActive_" ON "CashbackConfigurationTier"("cashbackConfigurationId", "isActive", "deletedAt");
CREATE INDEX "CashbackConfigurationTier_isActive_deletedAt_percentage_id" ON "CashbackConfigurationTier"("isActive", "deletedAt", "percentage");

-- MerchantLoyaltyReward indexes (filtered by loyaltyProgramId, isActive)
CREATE INDEX "MerchantLoyaltyReward_loyaltyProgramId_isActive_idx" ON "MerchantLoyaltyReward"("loyaltyProgramId", "isActive");
CREATE INDEX "MerchantLoyaltyReward_isActive_idx" ON "MerchantLoyaltyReward"("isActive");

-- Join table indexes (for eligibility queries)
CREATE INDEX "CashbackEligibleCustomerType_customerType_idx" ON "CashbackEligibleCustomerType"("customerType");
CREATE INDEX "CashbackEligibleCustomerType_cashbackConfigurationId_custom" ON "CashbackEligibleCustomerType"("cashbackConfigurationId", "customerType");
CREATE INDEX "ExclusiveOfferEligibleCustomerType_customerType_idx" ON "ExclusiveOfferEligibleCustomerType"("customerType");
CREATE INDEX "ExclusiveOfferEligibleCustomerType_exclusiveOfferId_custome" ON "ExclusiveOfferEligibleCustomerType"("exclusiveOfferId", "customerType");

-- Many-to-many indexes
CREATE INDEX "_CashbackConfigurationToOutlet_B_index" ON "_CashbackConfigurationToOutlet"("B");
CREATE INDEX "_ExclusiveOfferToOutlet_B_index" ON "_ExclusiveOfferToOutlet"("B");

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashbackConfiguration" ADD CONSTRAINT "CashbackConfiguration_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashbackConfiguration" ADD CONSTRAINT "CashbackConfiguration_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExclusiveOffer" ADD CONSTRAINT "ExclusiveOffer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExclusiveOffer" ADD CONSTRAINT "ExclusiveOffer_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_loyaltyProgramId_fkey" FOREIGN KEY ("loyaltyProgramId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomerType" ADD CONSTRAINT "CustomerType_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaybillOrTill" ADD CONSTRAINT "PaybillOrTill_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaybillOrTill" ADD CONSTRAINT "PaybillOrTill_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashbackConfigurationTier" ADD CONSTRAINT "CashbackConfigurationTier_cashbackConfigurationId_fkey" FOREIGN KEY ("cashbackConfigurationId") REFERENCES "CashbackConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashbackConfigurationTier" ADD CONSTRAINT "CashbackConfigurationTier_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MerchantLoyaltyReward" ADD CONSTRAINT "MerchantLoyaltyReward_loyaltyProgramId_fkey" FOREIGN KEY ("loyaltyProgramId") REFERENCES "LoyaltyProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MerchantLoyaltyReward" ADD CONSTRAINT "MerchantLoyaltyReward_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Join table foreign keys
ALTER TABLE "CashbackEligibleCustomerType" ADD CONSTRAINT "CashbackEligibleCustomerType_cashbackConfigurationId_fkey" FOREIGN KEY ("cashbackConfigurationId") REFERENCES "CashbackConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExclusiveOfferEligibleCustomerType" ADD CONSTRAINT "ExclusiveOfferEligibleCustomerType_exclusiveOfferId_fkey" FOREIGN KEY ("exclusiveOfferId") REFERENCES "ExclusiveOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Many-to-many foreign keys
ALTER TABLE "_CashbackConfigurationToOutlet" ADD CONSTRAINT "_CashbackConfigurationToOutlet_A_fkey" FOREIGN KEY ("A") REFERENCES "CashbackConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CashbackConfigurationToOutlet" ADD CONSTRAINT "_CashbackConfigurationToOutlet_B_fkey" FOREIGN KEY ("B") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ExclusiveOfferToOutlet" ADD CONSTRAINT "_ExclusiveOfferToOutlet_A_fkey" FOREIGN KEY ("A") REFERENCES "ExclusiveOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ExclusiveOfferToOutlet" ADD CONSTRAINT "_ExclusiveOfferToOutlet_B_fkey" FOREIGN KEY ("B") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
