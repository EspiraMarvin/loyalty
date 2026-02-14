import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class PerformanceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PerformanceMonitor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const info = gqlContext.getInfo();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const operationName = info?.fieldName || 'unknown';

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        if (duration > 1000) {
          this.logger.error(
            `CRITICAL: ${operationName} took ${duration}ms (> 1s)`,
          );
        } else if (duration > 500) {
          this.logger.warn(
            `SLOW: ${operationName} took ${duration}ms (> 500ms)`,
          );
        } else if (duration > 200) {
          this.logger.log(
            `MODERATE: ${operationName} took ${duration}ms (> 200ms)`,
          );
        } else {
          this.logger.debug(`FAST: ${operationName} took ${duration}ms`);
        }
      }),
    );
  }
}
