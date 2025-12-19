import { Module } from '@nestjs/common';
import { HanaService } from 'src/sap/hana/hana.service';
import { LoggerModule } from 'src/common/logger/logger.module';
import { SapService } from 'src/sap/hana/sap-hana.service';

@Module({
  imports: [LoggerModule],
  providers: [SapService, HanaService],
  exports: [SapService, HanaService],
})
export class SapModule {}
