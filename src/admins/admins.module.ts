import { Module } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { UploadModule } from '../upload/upload.module';
import { SapModule } from '../sap/sap.module';

@Module({
  imports: [UploadModule, SapModule],
  providers: [AdminsService],
  controllers: [AdminsController],
  exports: [AdminsService],
})
export class AdminsModule {}
