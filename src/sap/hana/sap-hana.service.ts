import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HanaService } from 'src/sap/hana/hana.service';
import { LoggerService } from 'src/common/logger/logger.service';
import { IBusinessPartner } from '../../common/interfaces/business-partner.interface';
import { loadSQL } from '../../common/utils/sql-loader.util';

@Injectable()
export class SapService {
  private readonly logger = new LoggerService();
  private readonly schema: string = process.env.SAP_SCHEMA || 'ALTITUDE_DB';
  constructor(private readonly hana: HanaService) {}

  async getBusinessPartnerByPhone(phone: string): Promise<IBusinessPartner[]> {
    const sql: string = loadSQL('users/queries/get-business-partner.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] Fetching business partner by phone: ${phone}`);

    try {
      const params: string[] = [phone, phone]; // Phone1 va Phone2 uchun
      const result: IBusinessPartner[] = await this.hana.executeOnce<IBusinessPartner>(sql, params);

      this.logger.log(`✅ [SAP] Found ${result.length} business partners`);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBusinessPartnerByPhone failed', message);

      throw new ServiceUnavailableException('SAP query failed (getBusinessPartnerByPhone)');
    }
  }
}
