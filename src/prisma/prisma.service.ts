/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // query performance logging
    this.$on('query' as never, (e: any) => {
      const duration = e.duration;
      const query = e.query;

      // only log slow queries (> 500ms)
      if (duration > 500) {
        this.logger.warn(
          `SLOW QUERY (${duration}ms): ${query.substring(0, 100)}...`,
        );
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected with query monitoring enabled');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
