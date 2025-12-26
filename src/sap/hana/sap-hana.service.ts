import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HanaService } from 'src/sap/hana/hana.service';
import { LoggerService } from 'src/common/logger/logger.service';
import {
  IBpMonthlyIncomeSummary,
  IBusinessPartner,
  InvestorIncomeSummary,
} from '../../common/interfaces/business-partner.interface';
import { loadSQL } from '../../common/utils/sql-loader.util';

@Injectable()
export class SapService {
  private readonly logger = new LoggerService();
  private readonly schema: string = process.env.SAP_SCHEMA || 'ALTITUDE_DB';

  constructor(private readonly hana: HanaService) {}

  // ------------------------------------------------------------------
  // Business Partner by phone
  // ------------------------------------------------------------------
  async getBusinessPartnerByPhone(phone: string): Promise<IBusinessPartner[]> {
    const sql = loadSQL('users/queries/get-business-partner.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] Fetching business partner by phone: ${phone}`);

    try {
      const params = [phone, phone];
      return await this.hana.executeOnce<IBusinessPartner>(sql, params);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBusinessPartnerByPhone failed', message);
      throw new ServiceUnavailableException('SAP query failed (getBusinessPartnerByPhone)');
    }
  }

  // ------------------------------------------------------------------
  // BP balance + monthly income
  // ------------------------------------------------------------------
  async getBpBalanceAndMonthlyIncome(
    bpCode: string,
    incomeAccount: number,
  ): Promise<IBpMonthlyIncomeSummary> {
    const sql = loadSQL('sap/hana/queries/get-bp-balance-and-monthly-income.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] BP income summary: bp=${bpCode}`);

    try {
      const params = [bpCode, bpCode, incomeAccount, bpCode, incomeAccount];
      const rows = await this.hana.executeOnce<IBpMonthlyIncomeSummary>(sql, params);

      return (
        rows?.[0] ?? {
          balance: 0,
          income_this_month: 0,
          income_last_month: 0,
          income_growth_percent: null,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBpBalanceAndMonthlyIncome failed', message);
      throw new ServiceUnavailableException('SAP query failed (getBpBalanceAndMonthlyIncome)');
    }
  }

  // ------------------------------------------------------------------
  // Investor income summary (Initial / Additional / Reinvest / Dividend)
  // ------------------------------------------------------------------
  async getInvestorIncomeSummary(
    bpCode: string,
    reinvestAccount: number,
  ): Promise<InvestorIncomeSummary> {
    const sql = loadSQL('sap/hana/queries/get-bp-income-summary.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(
      `📦 [SAP] Investor income summary: bp=${bpCode}, reinvestAcc=${reinvestAccount}`,
    );

    try {
      const params = [
        reinvestAccount, // ContraAct = ?
        bpCode, // ShortName = ?
      ];

      const rows: InvestorIncomeSummary[] = await this.hana.executeOnce<InvestorIncomeSummary>(
        sql,
        params,
      );

      return (
        rows?.[0] ?? {
          initial_capital: 0,
          additional_capital: 0,
          reinvest_fund: 0,
          dividend_paid: 0,
        }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getInvestorIncomeSummary failed', message);
      throw new ServiceUnavailableException('SAP query failed (getInvestorIncomeSummary)');
    }
  }
}
