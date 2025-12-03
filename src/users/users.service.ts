import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { LoggerService } from '../common/logger/logger.service';
import { loadSQL } from '../common/utils/sql-loader.util';
import { executeOnce } from '../common/utils/hana.util';
import type { IBusinessPartner } from '../common/interfaces/business-partner.interface';
import { IUser } from '../common/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly logger: LoggerService,
  ) {}

  private readonly table = 'users';
  private readonly schema: string = process.env.SAP_SCHEMA || 'PRO_ADDON';

  async createUser(data: {
    phone_main: string;
    phone_verified: boolean;
    status: 'Pending';
    sap_card_code?: string;
    sap_name?: string;
  }): Promise<IUser> {
    const user: IUser[] = await this.knex<IUser>(this.table)
      .insert({
        phone_main: data.phone_main,
        phone_verified: data.phone_verified,
        status: data.status,
        sap_card_code: data.sap_card_code,
        sap_card_name: data.sap_name,
      })
      .returning('*');

    return user[0];
  }

  async getBusinessPartnerByPhone(phone: string): Promise<IBusinessPartner[]> {
    const sql: string = loadSQL('users/queries/get-business-partner.sql').replace(
      /{{schema}}/g,
      this.schema,
    );

    this.logger.log(`📦 [SAP] Fetching business partner by phone: ${phone}`);

    try {
      const params: string[] = [phone, phone]; // Phone1 va Phone2 uchun
      const result: IBusinessPartner[] = await executeOnce<IBusinessPartner>(sql, params);

      this.logger.log(`✅ [SAP] Found ${result.length} business partners`);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ [SAP] getBusinessPartnerByPhone failed', message);

      throw new ServiceUnavailableException('SAP query failed (getBusinessPartnerByPhone)');
    }
  }

  async findByPhoneNumber(phone: string): Promise<IUser | undefined> {
    return this.knex<IUser>(this.table).where({ phone_main: phone }).first();
  }

  async markPhoneVerified(phone: string): Promise<void> {
    await this.knex(this.table).where({ phone_main: phone }).update({
      phone_verified: true,
      verification_code: null,
      status: 'Pending',
      updated_at: new Date(),
    });
  }

  async updateUserByPhone(
    phone: string,
    data: Partial<Pick<IUser, 'password' | 'status'>>,
  ): Promise<void> {
    const updateData: Partial<IUser> = {
      updated_at: new Date().toISOString(),
    };

    if (data.password) {
      updateData.password = data.password;
    }

    if (data.status) {
      updateData.status = data.status;
    }

    await this.knex<IUser>(this.table).where({ phone_main: phone }).update(updateData);
  }
}
