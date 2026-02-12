import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersResolver } from './offers.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OffersResolver, OffersService],
})
export class OffersModule {}
