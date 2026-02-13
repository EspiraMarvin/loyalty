import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Customer type rank mapping
const CUSTOMER_TYPE_RANKS = {
  NonCustomer: 0,
  New: 1,
  Infrequent: 2,
  Occasional: 3,
  Regular: 4,
  Vip: 5,
};

async function main() {
  console.log('Starting database seeding...');

  // Clean up existing data
  console.log('Cleaning up existing data...');
  await prisma.customerType.deleteMany();
  await prisma.cashbackEligibleCustomerType.deleteMany();
  await prisma.exclusiveOfferEligibleCustomerType.deleteMany();
  await prisma.cashbackConfigurationTier.deleteMany();
  await prisma.merchantLoyaltyReward.deleteMany();
  await prisma.loyaltyTier.deleteMany();
  await prisma.cashbackConfiguration.deleteMany();
  await prisma.exclusiveOffer.deleteMany();
  await prisma.loyaltyProgram.deleteMany();
  await prisma.paybillOrTill.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.review.deleteMany();

  // Create Reviews
  console.log('Creating reviews...');
  const reviews = await Promise.all([
    prisma.review.create({ data: { id: 'review-1', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-2', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-3', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-4', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-5', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-6', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-7', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-8', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-9', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-10', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-11', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-12', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-13', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-14', status: 'Approved' } }),
    prisma.review.create({ data: { id: 'review-15', status: 'Approved' } }),
  ]);

  // Create Merchants
  console.log('Creating merchants...');
  const merchant1 = await prisma.merchant.create({
    data: {
      id: 'merchant-1',
      businessName: 'Premium Coffee Shop',
      description: 'Artisan coffee and pastries',
      status: 'Active',
      category: 'Food & Beverage',
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      id: 'merchant-2',
      businessName: 'Tech Electronics Store',
      description: 'Latest gadgets and electronics',
      status: 'Active',
      category: 'Electronics',
    },
  });

  const merchant3 = await prisma.merchant.create({
    data: {
      id: 'merchant-3',
      businessName: 'Fashion Boutique',
      description: 'Trendy clothing and accessories',
      status: 'Active',
      category: 'Fashion',
    },
  });

  // Create Outlets
  console.log('Creating outlets...');
  const outlet1 = await prisma.outlet.create({
    data: {
      id: 'outlet-1',
      name: 'Premium Coffee Shop - Downtown',
      description: 'Main downtown location',
      isActive: true,
      merchantId: merchant1.id,
      reviewId: reviews[0].id,
    },
  });

  const outlet2 = await prisma.outlet.create({
    data: {
      id: 'outlet-2',
      name: 'Tech Electronics - Mall',
      description: 'Shopping mall branch',
      isActive: true,
      merchantId: merchant2.id,
      reviewId: reviews[1].id,
    },
  });

  const outlet3 = await prisma.outlet.create({
    data: {
      id: 'outlet-3',
      name: 'Fashion Boutique - City Center',
      description: 'City center flagship store',
      isActive: true,
      merchantId: merchant3.id,
      reviewId: reviews[2].id,
    },
  });

  // Create PaybillOrTills
  console.log('Creating payment methods...');
  await prisma.paybillOrTill.createMany({
    data: [
      {
        id: 'paybill-1',
        name: 'Paybill 123456',
        isActive: true,
        outletId: outlet1.id,
        reviewId: reviews[3].id,
      },
      {
        id: 'paybill-2',
        name: 'Till 789012',
        isActive: true,
        outletId: outlet2.id,
        reviewId: reviews[4].id,
      },
      {
        id: 'paybill-3',
        name: 'Paybill 345678',
        isActive: true,
        outletId: outlet3.id,
        reviewId: reviews[5].id,
      },
    ],
  });

  // Create Cashback Configurations
  console.log('Creating cashback configurations...');
  const cashback1 = await prisma.cashbackConfiguration.create({
    data: {
      id: 'cashback-1',
      name: '5% Cashback for All Customers',
      isActive: true,
      merchantId: merchant1.id,
      netCashbackBudget: 10000,
      usedCashbackBudget: 2000,
      reviewId: reviews[6].id,
    },
  });

  const cashback2 = await prisma.cashbackConfiguration.create({
    data: {
      id: 'cashback-2',
      name: 'VIP Cashback Program',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
      isActive: true,
      merchantId: merchant2.id,
      netCashbackBudget: 50000,
      usedCashbackBudget: 10000,
      reviewId: reviews[7].id,
    },
  });

  // Create Cashback Eligibility (Join Table Records)
  console.log('Creating cashback eligibility records...');
  await prisma.cashbackEligibleCustomerType.createMany({
    data: [
      // Cashback 1: All customers eligible
      {
        cashbackConfigurationId: cashback1.id,
        customerType: 'All',
      },
      // Cashback 2: VIP and Regular eligible
      {
        cashbackConfigurationId: cashback2.id,
        customerType: 'Vip',
      },
      {
        cashbackConfigurationId: cashback2.id,
        customerType: 'Regular',
      },
    ],
  });

  // Create Cashback Configuration Tiers
  console.log('Creating cashback tiers...');
  await prisma.cashbackConfigurationTier.createMany({
    data: [
      {
        id: 'tier-1',
        name: 'Standard Tier',
        percentage: 5.0,
        isActive: true,
        cashbackConfigurationId: cashback1.id,
        reviewId: reviews[8].id,
      },
      {
        id: 'tier-2',
        name: 'Premium Tier',
        percentage: 10.0,
        isActive: true,
        cashbackConfigurationId: cashback2.id,
        reviewId: reviews[9].id,
      },
    ],
  });

  // Create Exclusive Offers
  console.log('Creating exclusive offers...');
  const exclusive1 = await prisma.exclusiveOffer.create({
    data: {
      id: 'exclusive-1',
      name: '20% Off Flash Sale',
      description: 'Limited time offer on all items',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
      isActive: true,
      merchantId: merchant3.id,
      netOfferBudget: 5000,
      usedOfferBudget: 1000,
      reviewId: reviews[10].id,
    },
  });

  const exclusive2 = await prisma.exclusiveOffer.create({
    data: {
      id: 'exclusive-2',
      name: 'New Customer Welcome Offer',
      description: 'Special discount for new customers',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2027-12-31'),
      isActive: true,
      merchantId: merchant1.id,
      netOfferBudget: 3000,
      usedOfferBudget: 500,
      reviewId: reviews[11].id,
    },
  });

  // Create Exclusive Offer Eligibility (Join Table Records)
  console.log('Creating exclusive offer eligibility records...');
  await prisma.exclusiveOfferEligibleCustomerType.createMany({
    data: [
      // Exclusive 1: All customers eligible
      {
        exclusiveOfferId: exclusive1.id,
        customerType: 'All',
      },
      // Exclusive 2: New and NonCustomer eligible
      {
        exclusiveOfferId: exclusive2.id,
        customerType: 'New',
      },
      {
        exclusiveOfferId: exclusive2.id,
        customerType: 'NonCustomer',
      },
    ],
  });

  // Create Loyalty Program
  console.log('Creating loyalty programs...');
  const loyaltyProgram = await prisma.loyaltyProgram.create({
    data: {
      id: 'loyalty-1',
      name: 'Tech Rewards Program',
      isActive: true,
      merchantId: merchant2.id,
      pointsUsedInPeriod: 5000,
      pointsIssuedLimit: 100000,
      reviewId: reviews[12].id,
    },
  });

  // Create Loyalty Tiers (with rank)
  console.log('Creating loyalty tiers...');
  await prisma.loyaltyTier.createMany({
    data: [
      {
        id: 'loyalty-tier-1',
        name: 'Bronze Tier',
        isActive: true,
        minCustomerType: 'New',
        minRank: CUSTOMER_TYPE_RANKS.New,
        loyaltyProgramId: loyaltyProgram.id,
        reviewId: reviews[13].id,
      },
      {
        id: 'loyalty-tier-2',
        name: 'Gold Tier',
        isActive: true,
        minCustomerType: 'Regular',
        minRank: CUSTOMER_TYPE_RANKS.Regular,
        loyaltyProgramId: loyaltyProgram.id,
        reviewId: reviews[14].id,
      },
    ],
  });

  // Create Merchant Loyalty Rewards
  console.log('Creating loyalty rewards...');
  await prisma.merchantLoyaltyReward.create({
    data: {
      id: 'reward-1',
      name: 'Free Gadget',
      description: 'Redeem for a free accessory',
      pointsCost: 1000,
      isActive: true,
      loyaltyProgramId: loyaltyProgram.id,
      reviewId: reviews[0].id,
    },
  });

  // Create Customer Types (with rank)
  console.log('👥 Creating customer types...');
  await prisma.customerType.createMany({
    data: [
      {
        id: 'ct-1',
        userId: 'user-1',
        merchantId: merchant1.id,
        type: 'Regular',
        rank: CUSTOMER_TYPE_RANKS.Regular,
      },
      {
        id: 'ct-2',
        userId: 'user-1',
        merchantId: merchant2.id,
        type: 'Vip',
        rank: CUSTOMER_TYPE_RANKS.Vip,
      },
      {
        id: 'ct-3',
        userId: 'user-2',
        merchantId: merchant1.id,
        type: 'New',
        rank: CUSTOMER_TYPE_RANKS.New,
      },
      {
        id: 'ct-4',
        userId: 'user-2',
        merchantId: merchant3.id,
        type: 'Occasional',
        rank: CUSTOMER_TYPE_RANKS.Occasional,
      },
    ],
  });

  // Link Cashback Configurations to Outlets
  console.log('Linking cashback configurations to outlets...');
  await prisma.outlet.update({
    where: { id: outlet1.id },
    data: {
      CashbackConfigurations: {
        connect: [{ id: cashback1.id }],
      },
    },
  });

  await prisma.outlet.update({
    where: { id: outlet2.id },
    data: {
      CashbackConfigurations: {
        connect: [{ id: cashback2.id }],
      },
    },
  });

  // Link Exclusive Offers to Outlets
  console.log('Linking exclusive offers to outlets...');
  await prisma.outlet.update({
    where: { id: outlet1.id },
    data: {
      ExclusiveOffers: {
        connect: [{ id: exclusive2.id }],
      },
    },
  });

  await prisma.outlet.update({
    where: { id: outlet3.id },
    data: {
      ExclusiveOffers: {
        connect: [{ id: exclusive1.id }],
      },
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
