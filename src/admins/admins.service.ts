import { Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { Admin } from '../common/interfaces/admin.interface';
import { PaginationResult } from '../common/utils/pagination.util';
import { IUser } from 'src/common/interfaces/user.interface';
import { ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminsService {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async createAdmin(admin: Admin, super_admin_id: string): Promise<Admin> {
    const super_admin = await this.knex<Admin>('admins').where({ id: super_admin_id }).first();
    if (!super_admin?.is_protected) {
      throw new ForbiddenException('You don`t have rights to perform this action');
    }
    const [newAdmin] = await this.knex<Admin>('admins').insert(admin).returning('*');
    return newAdmin;
  }

  async getAdmins(
    admin_id: string,
    offset: number,
    limit: number,
  ): Promise<PaginationResult<Admin>> {
    const admin = await this.knex<Admin>('admins').where({ id: admin_id }).first();
    if (!admin?.is_protected) {
      throw new ForbiddenException('You don`t have rights to perform this action');
    }
    const rows = await this.knex<Admin>('admins')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ total }] = await this.knex<Admin>('admins').count({ total: '*' });

    return {
      rows: rows as Admin[],
      total: Number(total),
      limit,
      offset,
    };
  }

  async updateUser(user: IUser): Promise<IUser> {
    const [updatedUser] = await this.knex<IUser>('users')
      .where({ id: user.id })
      .update(user)
      .returning('*');

    return updatedUser;
  }

  async findByPhoneNumber(phone: string): Promise<Admin | undefined> {
    const admin = await this.knex<Admin>('admins').where({ phone_main: phone }).first();
    return admin;
  }

  async findById(id: string): Promise<Admin | undefined> {
    const admin = await this.knex<Admin>('admins').where({ id }).first();
    return admin;
  }

  async isAdmin(id: string): Promise<boolean> {
    const admin = await this.knex<Admin>('admins').where({ id }).first();
    return admin ? true : false;
  }
}
