import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from 'src/common/redis/redis.module';
import { FeatureModule } from 'src/feature/feature.module';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';
import { UsersModule } from '../users/users.module';
import { JwtUserStrategy } from '../common/strategies/jwt-user.strategy';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    FeatureModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtUserStrategy, JwtUserAuthGuard],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
