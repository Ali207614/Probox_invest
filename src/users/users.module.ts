import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LoggerService } from '../common/logger/logger.service';
import { SapModule } from '../sap/sap.module';
import { UploadModule } from '../upload/upload.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [SapModule, UploadModule, RedisModule],
  controllers: [UsersController],
  providers: [UsersService, LoggerService],
  exports: [UsersService],
})
export class UsersModule {}
