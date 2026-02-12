import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { MerchantType } from './merchant.type';
import { LoyaltyTierType } from './loyalty-tier.type';
import { MerchantLoyaltyRewardType } from './merchant-loyalty-reward.type';
import { ReviewType } from './review.type';

@ObjectType('LoyaltyProgram')
export class LoyaltyProgramType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  isActive: boolean;

  @Field(() => Float)
  pointsUsedInPeriod: number;

  @Field(() => Float, { nullable: true })
  pointsIssuedLimit?: number;

  @Field(() => MerchantType, { nullable: true })
  Merchant?: MerchantType;

  @Field(() => [LoyaltyTierType])
  LoyaltyTiers: LoyaltyTierType[];

  @Field(() => [MerchantLoyaltyRewardType])
  MerchantLoyaltyRewards: MerchantLoyaltyRewardType[];

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
