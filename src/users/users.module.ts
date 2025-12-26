import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LoggerService } from '../common/logger/logger.service';
import { SapModule } from '../sap/sap.module';

@Module({
  imports: [SapModule],
  controllers: [UsersController],
  providers: [UsersService, LoggerService],
  exports: [UsersService],
})
export class UsersModule {}
