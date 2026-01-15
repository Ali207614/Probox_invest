import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HanaService } from 'src/sap/hana/hana.service';
import { LoggerService } from 'src/common/logger/logger.service';
import {
  IBpMonthlyIncomeSummary,
  IBusinessPartner,
  InvestorTransaction,
} from '../../common/interfaces/business-partner.interface';
import { InvestorTransactionsQueryDto } from '../../users/dto/investor-transactions-query.dto';
import {
  InvestorTransactionsFilterDto,
  TransactionDirection,
  TransactionType,
} from '../../users/dto/investor-transactions-filter.dto';
import { loadSQL } from '../../common/utils/sql-loader.util';
import { normalizeUzPhone } from '../../common/utils/uz-phone.util';
import { coerceNumericStringsDeep, parseNumericString } from '../../common/utils/number.util';
import { InvestorMetricItem } from '../../common/interfaces/invester-summary.interface';
import { PaginationResult } from '../../common/utils/pagination.util';

@Injectable()
export class SapService {
  private readonly logger = new LoggerService();
  private readonly schema: string = process.env.SAP_SCHEMA || 'ALTITUDE_DB';

  constructor(private readonly hana: HanaService) {}

  async getBusinessPartnerByPhone(phone: string): Promise<IBusinessPartner[]> {
    const sql = loadSQL('sap/hana/queries/get-business-partner.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    const { last9 } = normalizeUzPhone(phone);

    this.logger.log(`📦 [SAP] Fetching business partner by phone (last9=${last9})`);

    try {
      return await this.hana.executeOnce<IBusinessPartner>(sql, [last9, last9]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      this.logger.error('❌ [SAP] getBusinessPartnerByPhone failed', message);

      throw new ServiceUnavailableException({
        message: 'SAP query failed (getBusinessPartnerByPhone)',
        location: 'sap.getBusinessPartnerByPhone',
      });
    }
  }

  async getBpBalanceAndMonthlyIncome(
    bpCode: string,
    incomeAccount: number,
  ): Promise<IBpMonthlyIncomeSummary> {
    const sql: string = loadSQL('sap/hana/queries/get-bp-balance-and-monthly-income.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] BP income summary: bp=${bpCode}`);

    try {
      const params: (string | number)[] = [bpCode, bpCode, incomeAccount, bpCode, incomeAccount];
      const rows: IBpMonthlyIncomeSummary[] = await this.hana.executeOnce<IBpMonthlyIncomeSummary>(
        sql,
        params,
      );

      return {
        balance: (parseNumericString(rows[0].balance) as number) ?? 0,
        income_this_month: (parseNumericString(rows[0].income_this_month) as number) ?? 0,
        income_last_month: (parseNumericString(rows[0].income_last_month) as number) ?? 0,
        income_growth_percent:
          rows[0].income_growth_percent == null
            ? null
            : (parseNumericString(rows[0].income_growth_percent) as number),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBpBalanceAndMonthlyIncome failed', message);
      throw new ServiceUnavailableException('SAP query failed (getBpBalanceAndMonthlyIncome)');
    }
  }

  async getInvestorIncomeSummary(
    bpCode: string,
    reinvestAccount: number,
  ): Promise<{
    meta: { total: number; limit: number; offset: number };
    data: InvestorMetricItem[];
  }> {
    const sql = loadSQL('sap/hana/queries/get-bp-income-summary.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(
      `📦 [SAP] Investor income summary: bp=${bpCode}, reinvestAcc=${reinvestAccount}`,
    );

    try {
      const params: (string | number)[] = [reinvestAccount, bpCode];
      const rows = await this.hana.executeOnce<Record<string, unknown>>(sql, params);
      const r = rows?.[0] ?? {};

      const initial_capital = (parseNumericString(r['initial_capital']) as number) ?? 0;
      const additional_capital = (parseNumericString(r['additional_capital']) as number) ?? 0;

      const reinvest_total = (parseNumericString(r['reinvest_fund']) as number) ?? 0;
      const reinvest_this_month = (parseNumericString(r['reinvest_this_month']) as number) ?? 0;
      const reinvest_last_month = (parseNumericString(r['reinvest_last_month']) as number) ?? 0;
      const reinvest_growth_percent =
        r['reinvest_growth_percent'] == null
          ? null
          : ((parseNumericString(r['reinvest_growth_percent']) as number) ?? null);

      const dividend_total = (parseNumericString(r['dividend_paid']) as number) ?? 0;
      const dividend_this_month = (parseNumericString(r['dividend_this_month']) as number) ?? 0;
      const dividend_last_month = (parseNumericString(r['dividend_last_month']) as number) ?? 0;
      const dividend_growth_percent =
        r['dividend_growth_percent'] == null
          ? null
          : ((parseNumericString(r['dividend_growth_percent']) as number) ?? null);

      const data: InvestorMetricItem[] = [
        {
          key: 'initial_capital',
          type: 'total_only',
          total: initial_capital,
        },
        {
          key: 'additional_capital',
          type: 'total_only',
          total: additional_capital,
        },
        {
          key: 'reinvest',
          type: 'monthly',
          total: reinvest_total,
          this_month: reinvest_this_month,
          last_month: reinvest_last_month,
          growth_percent: reinvest_growth_percent,
        },
        {
          key: 'dividend',
          type: 'monthly',
          total: dividend_total,
          this_month: dividend_this_month,
          last_month: dividend_last_month,
          growth_percent: dividend_growth_percent,
        },
      ];

      return {
        meta: { total: data.length, limit: data.length, offset: 0 },
        data,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getInvestorIncomeSummary failed', message);
      throw new ServiceUnavailableException('SAP query failed (getInvestorIncomeSummary)');
    }
  }

  async getInvestorTransactions(
    bpCode: string,
    reinvestAccount: number,
    query: InvestorTransactionsQueryDto,
    filters: InvestorTransactionsFilterDto,
  ): Promise<PaginationResult<InvestorTransaction>> {
    const { limit = 20, offset = 0 } = query;
    const { start_date, end_date, types, direction } = filters;

    const sql = loadSQL('sap/hana/queries/get-bp-investor-transactions.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(
      `📦 [SAP] Investor transactions list: bp=${bpCode}, filters=${JSON.stringify({
        ...query,
        ...filters,
      })}`,
    );

    try {
      const conditions: string[] = [];
      const filterParams: (string | number)[] = [];

      if (start_date) {
        conditions.push(`b."RefDate" >= ?`);
        filterParams.push(start_date);
      }

      if (end_date) {
        conditions.push(`b."RefDate" <= ?`);
        filterParams.push(end_date);
      }

      if (direction) {
        if (direction === TransactionDirection.INCOME) {
          conditions.push(`b.amount > 0`);
        } else if (direction === TransactionDirection.OUTCOME) {
          conditions.push(`b.amount < 0`);
        }
      }

      if (types && types.length > 0) {
        const typeConditions: string[] = [];
        for (const type of types) {
          switch (type) {
            case TransactionType.REINVEST:
              typeConditions.push(`b.is_reinvest = 1`);
              break;
            case TransactionType.DIVIDEND:
              typeConditions.push(`b.is_dividend = 1`);
              break;
            case TransactionType.INITIAL_CAPITAL:
              typeConditions.push(`(b.is_incoming = 1 AND b."RefDate" = fi.first_incoming_date)`);
              break;
            case TransactionType.ADDITIONAL_CAPITAL:
              typeConditions.push(`(b.is_incoming = 1 AND b."RefDate" <> fi.first_incoming_date)`);
              break;
            case TransactionType.OTHER:
              typeConditions.push(
                `(b.is_reinvest = 0 AND b.is_dividend = 0 AND b.is_incoming = 0)`,
              );
              break;
          }
        }
        if (typeConditions.length > 0) {
          conditions.push(`(${typeConditions.join(' OR ')})`);
        }
      }

      let finalSql = sql;
      if (conditions.length > 0) {
        const whereClause = `WHERE ${conditions.join(' AND ')} `;
        finalSql = finalSql.replace('ORDER BY', `${whereClause}ORDER BY`);
      }

      if (start_date) {
        finalSql = finalSql.replace(/ORDER BY([\s\S]+?)DESC([\s\S]+?)DESC/, 'ORDER BY$1ASC$2ASC');
      }

      // Params order: [reinvestAccount, bpCode] from Base CTE, then [filterParams], then [limit, offset]
      const params: (string | number)[] = [reinvestAccount, bpCode, ...filterParams, limit, offset];

      const totalsSql = `
        SELECT
            SUM(CASE WHEN (T0."Credit" - T0."Debit") > 0 THEN (T0."Credit" - T0."Debit") ELSE 0 END) AS "total_income",
            SUM(CASE WHEN (T0."Credit" - T0."Debit") < 0 THEN (T0."Credit" - T0."Debit") ELSE 0 END) AS "total_outcome"
        FROM ${this.schema}.JDT1 T0
        JOIN ${this.schema}.OJDT H ON H."TransId" = T0."TransId"
        WHERE T0."ShortName" = ?
          AND H."StornoToTr" IS NULL
      `;

      const [rows, totalsRow] = await Promise.all([
        this.hana.executeOnce<InvestorTransaction & { total: number }>(finalSql, params),
        this.hana.executeOnce<{ total_income: number; total_outcome: number }>(totalsSql, [bpCode]),
      ]);

      const total: number = (parseNumericString(rows?.[0]?.total) as number) ?? 0;
      const total_income = (parseNumericString(totalsRow?.[0]?.total_income) as number) ?? 0;
      const total_outcome = (parseNumericString(totalsRow?.[0]?.total_outcome) as number) ?? 0;

      const cleanedRows: InvestorTransaction[] = rows.map((r) => {
        const { total: _total, ...tx } = r as unknown as Record<string, unknown>;
        return coerceNumericStringsDeep(tx) as unknown as InvestorTransaction;
      });

      return {
        rows: cleanedRows,
        total,
        limit,
        offset,
        total_income,
        total_outcome,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getInvestorTransactions failed', message);
      throw new ServiceUnavailableException('SAP query failed (getInvestorTransactions)');
    }
  }
}
