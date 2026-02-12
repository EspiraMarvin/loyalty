import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { ReviewType } from './review.type';

@ObjectType('CashbackConfigurationTier')
export class CashbackConfigurationTierType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float)
  percentage: number;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
