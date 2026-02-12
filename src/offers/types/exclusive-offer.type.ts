/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { MerchantType } from './merchant.type';
import { ReviewType } from './review.type';

@ObjectType('ExclusiveOffer')
export class ExclusiveOfferType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  startDate: Date;

  @Field()
  endDate: Date;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  deletedAt?: Date;

  @Field(() => [String])
  eligibleCustomerTypes: string[];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Field(() => Float)
  netOfferBudget: number;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Field(() => Float)
  usedOfferBudget: number;

  @Field(() => MerchantType, { nullable: true })
  Merchant?: MerchantType;

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
