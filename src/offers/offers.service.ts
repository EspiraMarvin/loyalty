/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OffersFilterInput } from './dto/offers-filter.input';
import { ReviewStatusEnum } from '../common/enums/review-status.enum';
import { MerchantStatusEnum } from '../common/enums/merchant-status.enum';
import { Prisma } from '../../generated/prisma';

interface UserContext {
  userTypes: string[];
  userMerchantIds: string[];
  maxRank: number;
  customerTypes: Array<{ type: string; rank: number; merchantId: string }>;
}

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getOffers(filter: OffersFilterInput) {
    // mimic a slow query
    // await new Promise(resolve => setTimeout(resolve, 600)); // 600ms delay
    const now = new Date();

    // Build user context for eligibility
    const userContext = filter.userId
      ? await this.buildUserContext(filter.userId)
      : {
          userTypes: ['All'],
          userMerchantIds: [],
          maxRank: 0,
          customerTypes: [],
        };

    // execute 3 parallel queries as an optimization in place of an OR query
    const [cashbackOutlets, exclusiveOutlets, loyaltyOutlets] =
      await Promise.all([
        this.fetchCashbackOutlets(now, filter, userContext),
        this.fetchExclusiveOutlets(now, filter, userContext),
        this.fetchLoyaltyOutlets(now, filter, userContext),
      ]);

    // merge and remove duplicate outlets by ID
    // the 3 queries can return same outlet multiple times, we merge outlets by outlet.id to a single outlet
    // we use map here for fast lookups instead of a higher order fn like outlets.find() which is O(n) for each lookup
    // while map is O(1)
    const outletMap = new Map<string, any>();

    [...cashbackOutlets, ...exclusiveOutlets, ...loyaltyOutlets].forEach(
      (outlet: any) => {
        if (outletMap.has(outlet.id)) {
          // outlet already exists, merge its offers
          const existing = outletMap.get(outlet.id);
          existing.CashbackConfigurations = [
            ...(existing.CashbackConfigurations || []),
            ...(outlet.CashbackConfigurations || []),
          ];
          existing.ExclusiveOffers = [
            ...(existing.ExclusiveOffers || []),
            ...(outlet.ExclusiveOffers || []),
          ];
          // loyalty program is at merchant level and not the outlet level
          // so we keep for reference without merging to the outlet
          if (
            !existing.Merchant.LoyaltyProgram &&
            outlet.Merchant.LoyaltyProgram
          ) {
            existing.Merchant.LoyaltyProgram = outlet.Merchant.LoyaltyProgram;
          }
        } else {
          // if first time getting this outlet, add it to the map
          // ensure arrays exist (loyalty outlets don't have cashback/exclusive)
          outletMap.set(outlet.id, {
            ...outlet,
            CashbackConfigurations: outlet.CashbackConfigurations || [],
            ExclusiveOffers: outlet.ExclusiveOffers || [],
          });
        }
      },
    );

    const mergedOutlets = Array.from(outletMap.values());

    // budget filtering on the mergedOutlets data, without showing offers that have exceeded customer's budget
    // optimization: prisma doesn't support comparison btwn two fields in WHERE clause i.e WHERE usedCashbackBudget < netCashbackBudget
    const filteredOutlets = mergedOutlets
      .map((outlet: any) => ({
        ...outlet,
        // remove cashback offers that exceeded budget
        CashbackConfigurations: (outlet.CashbackConfigurations || [])
          .filter(
            (config: any) =>
              Number(config.usedCashbackBudget) <
              Number(config.netCashbackBudget),
          )
          .map((config: any) => ({
            ...config,
            // transform join table back to simple array for GraphQL response
            eligibleCustomerTypes: (config.EligibleCustomerTypes || []).map(
              (ect: any) => ect.customerType,
            ),
          })),
        // remove exclusive offers that exceeded budget
        ExclusiveOffers: (outlet.ExclusiveOffers || [])
          .filter(
            (offer: any) =>
              Number(offer.usedOfferBudget) < Number(offer.netOfferBudget),
          )
          .map((offer: any) => ({
            ...offer,
            // transform join table back to simple array for GraphQL response
            eligibleCustomerTypes: (offer.EligibleCustomerTypes || []).map(
              (ect: any) => ect.customerType,
            ),
          })),
        Merchant: {
          ...outlet.Merchant,
          // remove loyalty program if it exceeded points limit
          LoyaltyProgram:
            outlet.Merchant.LoyaltyProgram &&
            (!outlet.Merchant.LoyaltyProgram.pointsIssuedLimit ||
              Number(outlet.Merchant.LoyaltyProgram.pointsUsedInPeriod) <
                Number(outlet.Merchant.LoyaltyProgram.pointsIssuedLimit))
              ? outlet.Merchant.LoyaltyProgram
              : null,
        },
      }))
      // remove outlets that have no eligible offers after budget filtering
      .filter(
        (outlet: any) =>
          outlet.CashbackConfigurations.length > 0 ||
          outlet.ExclusiveOffers.length > 0 ||
          outlet.Merchant.LoyaltyProgram !== null,
      );

    return {
      outlets: filteredOutlets,
      totalCount: filteredOutlets.length,
    };
  }

  /**
   * build user eligibility context
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    /* 
    cache user merchant relationship, this rarely changes
    for this test, I've just harded coded and seeded users
    */
    const cacheKey = `user-context:${userId}`;

    try {
      // cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user ${userId}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      // redis cache failure, log & continue
      this.logger.warn('Redis read failed, continuing without cache:', error);
    }

    // if not cached, fetch from db
    const customerTypes = await this.prisma.customerType.findMany({
      where: { userId },
      select: { type: true, rank: true, merchantId: true },
    });

    // get unique customer types and max rank (without "All" or "NonCustomer" - these are handled separately)
    const userTypes = [...new Set(customerTypes.map((ct) => ct.type))];
    const userMerchantIds = customerTypes.map((ct) => ct.merchantId);
    const maxRank =
      customerTypes.length > 0
        ? Math.max(...customerTypes.map((ct) => ct.rank))
        : 0;

    const context: UserContext = {
      userTypes,
      userMerchantIds,
      maxRank,
      customerTypes,
    };

    try {
      // cache set for 3 mins TLL before expiration
      await this.redis.setex(cacheKey, 180, JSON.stringify(context));
    } catch (error) {
      // redis failure, log and continue
      this.logger.warn('Redis write failed, continuing without cache:', error);
    }

    return context;
  }

  /**
   * Build reusable where clause for cashback eligibility
   */
  private buildCashbackWhere(
    now: Date,
    userContext: UserContext,
    percentageFilter: Prisma.CashbackConfigurationTierWhereInput,
  ): Prisma.CashbackConfigurationWhereInput {
    return {
      isActive: true,
      deletedAt: null,
      Review: { status: ReviewStatusEnum.Approved },
      // date validation: offer must be currently active
      OR: [
        { AND: [{ startDate: null }, { endDate: null }] },
        { AND: [{ startDate: { lte: now } }, { endDate: { gte: now } }] },
      ],
      // eligibility filtering
      AND: [
        {
          OR: [
            // case 1: All customer types
            { EligibleCustomerTypes: { some: { customerType: 'All' } } },
            // case 2: NonCustomer
            {
              AND: [
                {
                  EligibleCustomerTypes: {
                    some: { customerType: 'NonCustomer' },
                  },
                },
                { merchantId: { notIn: userContext.userMerchantIds } },
              ],
            },
            // case 3: user's specific customer types
            ...(userContext.userTypes.length > 0
              ? [
                  {
                    EligibleCustomerTypes: {
                      some: {
                        customerType: { in: userContext.userTypes },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      // tier validation
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

  /**
   * Build reusable where clause for exclusive offer eligibility
   */
  private buildExclusiveOfferWhere(
    now: Date,
    userContext: UserContext,
  ): Prisma.ExclusiveOfferWhereInput {
    return {
      isActive: true,
      deletedAt: null,
      startDate: { lte: now },
      endDate: { gte: now },
      Review: { status: ReviewStatusEnum.Approved },
      // eligibility filtering
      AND: [
        {
          OR: [
            // case 1: All customers
            { EligibleCustomerTypes: { some: { customerType: 'All' } } },
            // case 2: NonCustomer
            {
              AND: [
                {
                  EligibleCustomerTypes: {
                    some: { customerType: 'NonCustomer' },
                  },
                },
                { merchantId: { notIn: userContext.userMerchantIds } },
              ],
            },
            // case 3: user's specific customer types
            ...(userContext.userTypes.length > 0
              ? [
                  {
                    EligibleCustomerTypes: {
                      some: {
                        customerType: { in: userContext.userTypes },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      ],
    };
  }

  /**
   * fetch outlets with cashback offers
   */
  private async fetchCashbackOutlets(
    now: Date,
    filter: OffersFilterInput,
    userContext: UserContext,
  ) {
    const { search, category, minPercentage, maxPercentage } = filter;

    // build percentage filter based on what user provided
    // eg: user requests offers between 5% and 15% cashback this becomes { percentage: { gte: 5, lte: 15 } }
    const percentageFilter: Prisma.CashbackConfigurationTierWhereInput = {};
    if (minPercentage !== undefined && maxPercentage !== undefined) {
      percentageFilter.percentage = { gte: minPercentage, lte: maxPercentage };
    } else if (minPercentage !== undefined) {
      percentageFilter.percentage = { gte: minPercentage };
    } else if (maxPercentage !== undefined) {
      percentageFilter.percentage = { lte: maxPercentage };
    }

    // build reusable where clause for cashback filtering
    const cashbackWhere = this.buildCashbackWhere(
      now,
      userContext,
      percentageFilter,
    );

    return this.prisma.outlet.findMany({
      where: {
        isActive: true,
        Review: { status: ReviewStatusEnum.Approved },
        Merchant: {
          status: MerchantStatusEnum.Active,
          ...(category && { category }),
        },
        PaybillOrTills: {
          some: {
            isActive: true,
            deletedAt: null,
            Review: { status: ReviewStatusEnum.Approved },
          },
        },
        // search across both merchant and outlet fields
        ...(search && {
          OR: [
            // search merchant businessName
            {
              Merchant: {
                businessName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search merchant description
            {
              Merchant: {
                description: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search outlet name
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            // search outlet description
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
        CashbackConfigurations: {
          some: cashbackWhere, // use helper method
        },
      },
      // include other related data to avoid N+1 queries later when merging results later
      // this includes merchant info, cashback configs, exclusive offers, loyalty program & review infor for each outlet
      include: {
        Merchant: {
          include: {
            // include loyalty program even though this is a cashback query
            // because outlets can have multiple offer types
            LoyaltyProgram: {
              include: {
                LoyaltyTiers: { include: { Review: true } },
                MerchantLoyaltyRewards: { include: { Review: true } },
                Review: true,
              },
            },
          },
        },
        CashbackConfigurations: {
          where: cashbackWhere, // helper method to filter included data
          include: {
            Merchant: true,
            Review: true,
            CashbackConfigurationTiers: { include: { Review: true } },
            EligibleCustomerTypes: true,
          },
        },
        Review: true,
      },
    });
  }

  /**
   * fetch outlets with exclusive offers
   */
  private async fetchExclusiveOutlets(
    now: Date,
    filter: OffersFilterInput,
    userContext: UserContext,
  ) {
    const { search, category } = filter;

    // build reusable where clause for exclusive offer filtering
    const exclusiveOfferWhere = this.buildExclusiveOfferWhere(now, userContext);

    return this.prisma.outlet.findMany({
      where: {
        isActive: true,
        Review: { status: ReviewStatusEnum.Approved },
        Merchant: {
          status: MerchantStatusEnum.Active,
          ...(category && { category }),
        },
        PaybillOrTills: {
          some: {
            isActive: true,
            deletedAt: null,
            Review: { status: ReviewStatusEnum.Approved },
          },
        },
        // search across both merchant and outlet fields
        ...(search && {
          OR: [
            // search merchant businessName
            {
              Merchant: {
                businessName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search merchant description
            {
              Merchant: {
                description: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search outlet name
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            // search outlet description
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
        ExclusiveOffers: {
          some: exclusiveOfferWhere, // use helper method
        },
      },
      include: {
        Merchant: {
          include: {
            LoyaltyProgram: {
              include: {
                LoyaltyTiers: { include: { Review: true } },
                MerchantLoyaltyRewards: { include: { Review: true } },
                Review: true,
              },
            },
          },
        },
        ExclusiveOffers: {
          where: exclusiveOfferWhere, // use helper method to filter included data
          include: {
            Merchant: true,
            Review: true,
            EligibleCustomerTypes: true,
          },
        },
        Review: true,
      },
    });
  }

  /**
   * fetch outlets with loyalty programs
   */
  private async fetchLoyaltyOutlets(
    now: Date,
    filter: OffersFilterInput,
    userContext: UserContext,
  ) {
    const { search, category } = filter;

    // only query if user has customer types (loyalty requires merchant relationship)
    if (!filter.userId || userContext.customerTypes.length === 0) {
      return [];
    }

    return this.prisma.outlet.findMany({
      where: {
        isActive: true,
        Review: { status: ReviewStatusEnum.Approved },
        Merchant: {
          status: MerchantStatusEnum.Active,
          // only show loyalty programs for merchants the user has a relationship with
          id: { in: userContext.userMerchantIds },
          ...(category && { category }),
          LoyaltyProgram: {
            isActive: true,
            Review: { status: ReviewStatusEnum.Approved },

            // Optimization
            // numeric rank comparison for customer type hierarchy
            // instead of string matching with hierarchy logic
            //   WHERE minCustomerType IN ['New', 'Infrequent', 'Occasional', 'Regular']
            //   for a 'Regular' customer which is hard to query and not indexable
            // I've replaced with numeric rank field
            //   NonCustomer: 0, New: 1, Infrequent: 2, Occasional: 3, Regular: 4, VIP: 5
            //   WHERE minRank <= userMaxRank this is simple numeric comparison and indexable
            // eg: VIP user (rank 5) can access ALL tiers (minRank 0-5) while Regular user (rank 4) can access tiers 0-4, but NOT VIP tier 5
            LoyaltyTiers: {
              some: {
                isActive: true,
                deletedAt: null,
                minRank: { lte: userContext.maxRank },
                Review: { status: ReviewStatusEnum.Approved },
              },
            },

            // loyalty program must have at least one reward
            MerchantLoyaltyRewards: {
              some: {
                isActive: true,
                Review: { status: ReviewStatusEnum.Approved },
              },
            },
          },
        },
        PaybillOrTills: {
          some: {
            isActive: true,
            deletedAt: null,
            Review: { status: ReviewStatusEnum.Approved },
          },
        },
        // search across both merchant and outlet fields
        ...(search && {
          OR: [
            // search merchant businessName
            {
              Merchant: {
                businessName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search merchant description
            {
              Merchant: {
                description: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            // search outlet name
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            // search outlet description
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }),
      },
      include: {
        Merchant: {
          include: {
            LoyaltyProgram: {
              include: {
                LoyaltyTiers: { include: { Review: true } },
                MerchantLoyaltyRewards: { include: { Review: true } },
                Review: true,
              },
            },
          },
        },
        Review: true,
      },
    });
  }
}
