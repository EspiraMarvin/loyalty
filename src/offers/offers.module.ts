import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersResolver } from './offers.resolver';

@Module({
  providers: [OffersResolver, OffersService],
})
export class OffersModule {}
