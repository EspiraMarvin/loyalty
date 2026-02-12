import { ObjectType, Field, ID } from '@nestjs/graphql';
import { MerchantType } from './merchant.type';
import { CashbackConfigurationType } from './cashback-configuration.type';
import { ExclusiveOfferType } from './exclusive-offer.type';
import { ReviewType } from './review.type';

@ObjectType('Outlet')
export class OutletType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  isActive: boolean;

  @Field(() => MerchantType)
  Merchant: MerchantType;

  @Field(() => [CashbackConfigurationType])
  CashbackConfigurations: CashbackConfigurationType[];

  @Field(() => [ExclusiveOfferType])
  ExclusiveOffers: ExclusiveOfferType[];

  @Field(() => ReviewType, { nullable: true })
  Review?: ReviewType;
}
