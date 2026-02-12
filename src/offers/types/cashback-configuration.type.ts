import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { MerchantType } from './merchant.type';
import { ReviewType } from './review.type';
import { CashbackConfigurationTierType } from './cashback-configuration-tier.type';

@ObjectType('CashbackConfiguration')
export class CashbackConfigurationType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => [String])
  eligibleCustomerTypes: string[];

  @Field(() => Float)
  netCashbackBudget: number;

  @Field(() => Float)
  usedCashbackBudget: number;

  @Field(() => MerchantType)
  Merchant: MerchantType;

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;

  @Field(() => [CashbackConfigurationTierType])
  CashbackConfigurationTiers: CashbackConfigurationTierType[];
}
