import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { KnexModule } from 'nestjs-knex';
import knexConfig from './config/knex.config';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { PublicRoutes } from './config/public.routes';
import { RateLimiterByIpMiddleware } from './common/middleware/rate-limiter-by-ip.middleware';
import { MaintenanceMiddleware } from './common/middleware/maintenance.middleware';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';
import { BullModule } from '@nestjs/bull';
import { FeatureModule } from './feature/feature.module';
import { FeatureController } from './feature/feature.controller';
import { FeatureService } from './feature/feature.service';
import { LoggerModule } from './common/logger/logger.module';
import { LoggerService } from './common/logger/logger.service';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { RateLimitedUserRoutes } from './config/user-rate-limited.routes';
import { SapModule } from './sap/sap.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FeatureModule,
    LoggerModule,
    AuthModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    BullModule.registerQueue({
      name: 'sap',
    }),
    KnexModule.forRoot({ config: knexConfig }),
    UsersModule,
    SapModule,
    NotificationsModule,
  ],
  controllers: [FeatureController, UsersController, AuthController],
  providers: [FeatureService, LoggerService, UsersService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');

    consumer.apply(RateLimiterByIpMiddleware).forRoutes(...PublicRoutes);

    consumer.apply(JwtMiddleware, RateLimiterMiddleware).forRoutes(...RateLimitedUserRoutes);

    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
