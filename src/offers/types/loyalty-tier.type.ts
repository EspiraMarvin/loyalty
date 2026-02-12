import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ReviewType } from './review.type';

@ObjectType('LoyaltyTier')
export class LoyaltyTierType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field()
  minCustomerType: string;

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
