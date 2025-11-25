import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { KnexModule } from 'nestjs-knex';
import knexConfig from './config/knex.config';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { RateLimitedAdminRoutes } from './config/admin-rate-limited.routes';
import { RateLimitedUserRoutes } from './config/user-rate-limited.routes';
import { PublicRoutes } from './config/public.routes';
import { RateLimiterByIpMiddleware } from './common/middleware/rate-limiter-by-ip.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    KnexModule.forRoot({ config: knexConfig }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');

    consumer.apply(RateLimiterByIpMiddleware).forRoutes(...PublicRoutes);

    consumer.apply(JwtMiddleware, RateLimiterMiddleware).forRoutes(...RateLimitedUserRoutes);

    consumer.apply(JwtMiddleware, RateLimiterMiddleware).forRoutes(...RateLimitedAdminRoutes);

    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
