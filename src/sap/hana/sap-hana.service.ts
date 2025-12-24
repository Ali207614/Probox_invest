import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HanaService } from 'src/sap/hana/hana.service';
import { LoggerService } from 'src/common/logger/logger.service';
import {IBpMonthlyIncomeSummary, IBusinessPartner} from '../../common/interfaces/business-partner.interface';
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

  async getBpBalanceAndMonthlyIncome(
    bpCode: string,
    incomeAccount: string, // masalan '8710'
  ): Promise<IBpMonthlyIncomeSummary> {
    const sql = loadSQL('sap/hana/queries/get-bp-balance-and-monthly-income.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] BP income summary: bp=${bpCode}, acc=${incomeAccount}`);

    try {
      // ? placeholders tartibi bo‘yicha:
      // 1) bp_balance WHERE ShortName = ?
      // 2) per_trans SUM ShortName = ?
      // 3) per_trans SUM Account = ?
      // 4) per_trans WHERE ShortName = ?
      // 5) per_trans WHERE Account = ?
      const params = [bpCode, bpCode, incomeAccount, bpCode, incomeAccount];

      const rows: IBpMonthlyIncomeSummary[] = await this.hana.executeOnce<IBpMonthlyIncomeSummary>(sql, params);

      // executeOnce sizda array qaytaradi; bizga 1 row kerak
      return (
        rows?.[0] ?? {
          Balance: 0,
          IncomeThisMonth: 0,
          IncomeLastMonth: 0,
          IncomeGrowthPercent: null,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBpBalanceAndMonthlyIncome failed', message);
      throw new ServiceUnavailableException('SAP query failed (getBpBalanceAndMonthlyIncome)');
    }
  }
}
