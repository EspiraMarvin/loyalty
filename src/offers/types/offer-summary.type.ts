import { ObjectType, Field } from '@nestjs/graphql';
import { OutletType } from './outlet.type';

@ObjectType('OfferSummary')
export class OfferSummaryType {
  @Field(() => [OutletType])
  outlets: OutletType[];

  @Field()
  totalCount: number;
}
