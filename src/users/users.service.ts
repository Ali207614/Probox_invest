import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { IUser } from '../common/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  private readonly table = 'users';

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
