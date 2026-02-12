import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { ReviewType } from './review.type';

@ObjectType('MerchantLoyaltyReward')
export class MerchantLoyaltyRewardType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float)
  pointsCost: number;

  @Field()
  isActive: boolean;

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
