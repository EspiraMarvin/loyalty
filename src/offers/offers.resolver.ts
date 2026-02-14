import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseInterceptors } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferSummaryType } from './types/offer-summary.type';
import { OffersFilterInput } from './dto/offers-filter.input';
import { PerformanceLoggingInterceptor } from '../common/interceptors/performance-logging.interceptor';

@Resolver()
@UseInterceptors(PerformanceLoggingInterceptor)
export class OffersResolver {
  constructor(private readonly offersService: OffersService) {}

  @Query(() => OfferSummaryType, {
    name: 'offers',
    description: 'Get all available offers filtered by various criteria',
  })
  async getOffers(
    @Args('filter', { type: () => OffersFilterInput, nullable: true })
    filter?: OffersFilterInput,
  ): Promise<OfferSummaryType> {
    return (await this.offersService.getOffers(filter || {})) as any;
  }
}
