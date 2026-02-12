import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OffersFilterInput } from './dto/offers-filter.input';
import { ReviewStatusEnum } from '../common/enums/review-status.enum';
import { MerchantStatusEnum } from '../common/enums/merchant-status.enum';
import { Prisma } from '../../generated/prisma';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async getOffers(filter: OffersFilterInput) {
    const now = new Date();

    // Build eligibility conditions if userId is provided
    let cashbackEligibility: Prisma.CashbackConfigurationWhereInput['OR'] = [
      { eligibleCustomerTypes: { has: 'All' } },
    ];
    let exclusiveOfferEligibility: Prisma.ExclusiveOfferWhereInput['OR'] = [
      { eligibleCustomerTypes: { has: 'All' } },
    ];
    let loyaltyProgramEligibility: Prisma.LoyaltyProgramWhereInput['OR'] = [];

    if (filter.userId) {
      const eligibilityConditions = await this.buildOfferEligibilityConditions(
        filter.userId,
      );
      cashbackEligibility = eligibilityConditions.cashbackEligibility;
      exclusiveOfferEligibility =
        eligibilityConditions.exclusiveOfferEligibility;
      loyaltyProgramEligibility =
        eligibilityConditions.loyaltyProgramEligibility;
    }

    // Build the where clause
    const whereClause = this.buildOfferFilters({
      now,
      search: filter.search,
      category: filter.category,
      minPercentage: filter.minPercentage,
      maxPercentage: filter.maxPercentage,
      cashbackEligibility,
      exclusiveOfferEligibility,
      loyaltyProgramEligibility,
    });

    // Execute the query
    const outlets = await this.prisma.outlet.findMany({
      where: whereClause,
      include: {
        Merchant: {
          include: {
            LoyaltyProgram: {
              include: {
                LoyaltyTiers: {
                  include: {
                    Review: true,
                  },
                },
                MerchantLoyaltyRewards: {
                  include: {
                    Review: true,
                  },
                },
                Review: true,
              },
            },
          },
        },
        CashbackConfigurations: {
          include: {
            Merchant: true,
            Review: true,
            CashbackConfigurationTiers: {
              include: {
                Review: true,
              },
            },
          },
        },
        ExclusiveOffers: {
          include: {
            Merchant: true,
            Review: true,
          },
        },
        Review: true,
      },
    });

    // Post-query filtering for budget limits (Prisma doesn't support field-to-field comparison)
    const filteredOutlets = outlets
      .map((outlet) => ({
        ...outlet,
        CashbackConfigurations: outlet.CashbackConfigurations.filter(
          (config) =>
            Number(config.usedCashbackBudget) <
            Number(config.netCashbackBudget),
        ),
        ExclusiveOffers: outlet.ExclusiveOffers.filter(
          (offer) =>
            Number(offer.usedOfferBudget) < Number(offer.netOfferBudget),
        ),
        Merchant: {
          ...outlet.Merchant,
          LoyaltyProgram:
            outlet.Merchant.LoyaltyProgram &&
            outlet.Merchant.LoyaltyProgram.pointsIssuedLimit &&
            Number(outlet.Merchant.LoyaltyProgram.pointsUsedInPeriod) <
              Number(outlet.Merchant.LoyaltyProgram.pointsIssuedLimit)
              ? outlet.Merchant.LoyaltyProgram
              : null,
        },
      }))
      .filter(
        (outlet) =>
          outlet.CashbackConfigurations.length > 0 ||
          outlet.ExclusiveOffers.length > 0 ||
          outlet.Merchant.LoyaltyProgram !== null,
      );

    return {
      outlets: filteredOutlets,
      totalCount: filteredOutlets.length,
    };
  }

  private async buildOfferEligibilityConditions(userId: string) {
    // Fetch user's customer types
    const customerTypes = await this.prisma.customerType.findMany({
      where: { userId },
    });

    const cashbackEligibility: Prisma.CashbackConfigurationWhereInput['OR'] = [
      { eligibleCustomerTypes: { has: 'All' } },
    ];

    const exclusiveOfferEligibility: Prisma.ExclusiveOfferWhereInput['OR'] = [
      { eligibleCustomerTypes: { has: 'All' } },
    ];

    const loyaltyProgramEligibility: Prisma.LoyaltyProgramWhereInput['OR'] = [];

    // Get merchant IDs where user is NOT a customer for NonCustomer eligibility
    const userMerchantIds = customerTypes.map((ct) => ct.merchantId);

    // Add NonCustomer eligibility
    if (userMerchantIds.length > 0) {
      cashbackEligibility.push({
        eligibleCustomerTypes: { has: 'NonCustomer' },
        merchantId: { notIn: userMerchantIds },
      });
      exclusiveOfferEligibility.push({
        eligibleCustomerTypes: { has: 'NonCustomer' },
        merchantId: { notIn: userMerchantIds },
      });
    } else {
      // User has no customer types, so all NonCustomer offers are eligible
      cashbackEligibility.push({
        eligibleCustomerTypes: { has: 'NonCustomer' },
      });
      exclusiveOfferEligibility.push({
        eligibleCustomerTypes: { has: 'NonCustomer' },
      });
    }

    // Add specific customer type eligibility
    customerTypes.forEach((ct) => {
      cashbackEligibility.push({
        merchantId: ct.merchantId,
        eligibleCustomerTypes: { has: ct.type },
      });

      exclusiveOfferEligibility.push({
        merchantId: ct.merchantId,
        eligibleCustomerTypes: { has: ct.type },
      });

      // For loyalty programs, consider hierarchy
      const eligibleTypes = this.getEligibleTypesForHierarchy(ct.type);
      eligibleTypes.forEach((eligibleType) => {
        loyaltyProgramEligibility.push({
          merchantId: ct.merchantId,
          LoyaltyTiers: {
            some: {
              minCustomerType: eligibleType,
              isActive: true,
              deletedAt: null,
              Review: { status: ReviewStatusEnum.Approved },
            },
          },
        });
      });
    });

    return {
      cashbackEligibility,
      exclusiveOfferEligibility,
      loyaltyProgramEligibility,
    };
  }

  private getEligibleTypesForHierarchy(customerType: string): string[] {
    const hierarchy = [
      'NonCustomer',
      'New',
      'Infrequent',
      'Occasional',
      'Regular',
      'Vip',
    ];
    const typeIndex = hierarchy.indexOf(customerType);
    return typeIndex >= 0 ? hierarchy.slice(0, typeIndex + 1) : [];
  }

  private buildOfferFilters({
    now,
    search,
    category,
    minPercentage,
    maxPercentage,
    cashbackEligibility,
    exclusiveOfferEligibility,
    loyaltyProgramEligibility,
  }: {
    now: Date;
    search?: string;
    category?: string;
    minPercentage?: number;
    maxPercentage?: number;
    cashbackEligibility: Prisma.CashbackConfigurationWhereInput['OR'];
    exclusiveOfferEligibility: Prisma.ExclusiveOfferWhereInput['OR'];
    loyaltyProgramEligibility: Prisma.LoyaltyProgramWhereInput['OR'];
  }): Prisma.OutletWhereInput {
    const searchFilters = search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const merchantSearchFilters = search
      ? {
          OR: [
            {
              businessName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    return {
      isActive: true,
      Review: { status: ReviewStatusEnum.Approved },
      Merchant: {
        status: MerchantStatusEnum.Active,
        ...(category && { category }),
        ...merchantSearchFilters,
      },
      PaybillOrTills: {
        some: {
          isActive: true,
          deletedAt: null,
          Review: { status: ReviewStatusEnum.Approved },
        },
      },
      ...searchFilters,
      OR: [
        // Cashback offers
        {
          CashbackConfigurations: {
            some: this.buildCashbackConditions(
              now,
              minPercentage,
              maxPercentage,
              cashbackEligibility,
            ),
          },
        },
        // Exclusive offers
        {
          ExclusiveOffers: {
            some: this.buildExclusiveOfferConditions(
              now,
              exclusiveOfferEligibility,
            ),
          },
        },
        // Loyalty programs
        ...(loyaltyProgramEligibility && loyaltyProgramEligibility.length > 0
          ? [
              {
                Merchant: {
                  LoyaltyProgram: this.buildLoyaltyConditions(
                    loyaltyProgramEligibility,
                  ),
                },
              },
            ]
          : []),
      ],
    };
  }

  private buildCashbackConditions(
    now: Date,
    minPercentage?: number,
    maxPercentage?: number,
    eligibilityConditions: NonNullable<
      Prisma.CashbackConfigurationWhereInput['OR']
    > = [],
  ): Prisma.CashbackConfigurationWhereInput {
    const percentageFilter: Prisma.CashbackConfigurationTierWhereInput = {};

    if (minPercentage !== undefined && maxPercentage !== undefined) {
      percentageFilter.percentage = { gte: minPercentage, lte: maxPercentage };
    } else if (minPercentage !== undefined) {
      percentageFilter.percentage = { gte: minPercentage };
    } else if (maxPercentage !== undefined) {
      percentageFilter.percentage = { lte: maxPercentage };
    }

    return {
      isActive: true,
      deletedAt: null,
      // Note: Budget comparison (usedCashbackBudget < netCashbackBudget)
      // needs to be filtered in application code or use Prisma.sql
      // For now, we'll fetch all and filter later if needed
      Review: { status: ReviewStatusEnum.Approved },
      AND: [
        {
          OR: [
            { AND: [{ startDate: null }, { endDate: null }] },
            { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] },
          ],
        },
        ...(eligibilityConditions.length > 0
          ? [{ OR: eligibilityConditions }]
          : []),
      ],
      CashbackConfigurationTiers: {
        some: {
          deletedAt: null,
          isActive: true,
          Review: { status: ReviewStatusEnum.Approved },
          ...percentageFilter,
        },
      },
    };
  }

  private buildExclusiveOfferConditions(
    now: Date,
    eligibilityConditions: NonNullable<
      Prisma.ExclusiveOfferWhereInput['OR']
    > = [],
  ): Prisma.ExclusiveOfferWhereInput {
    return {
      isActive: true,
      deletedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
      // Note: Budget comparison (usedOfferBudget < netOfferBudget)
      // needs to be filtered in application code or use Prisma.sql
      Review: { status: ReviewStatusEnum.Approved },
      ...(eligibilityConditions.length > 0
        ? { OR: eligibilityConditions }
        : {}),
    };
  }

  private buildLoyaltyConditions(
    eligibilityConditions: NonNullable<Prisma.LoyaltyProgramWhereInput['OR']>,
  ): Prisma.LoyaltyProgramWhereInput {
    return {
      isActive: true,
      OR: eligibilityConditions,
      // Note: Points comparison (pointsUsedInPeriod < pointsIssuedLimit)
      // needs to be filtered in application code or use Prisma.sql
      Review: { status: ReviewStatusEnum.Approved },
      LoyaltyTiers: {
        some: {
          isActive: true,
          deletedAt: null,
          Review: { status: ReviewStatusEnum.Approved },
        },
      },
      MerchantLoyaltyRewards: {
        some: {
          isActive: true,
          Review: { status: ReviewStatusEnum.Approved },
        },
      },
    };
  }
}
