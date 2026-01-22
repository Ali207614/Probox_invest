import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { Admin } from '../common/interfaces/admin.interface';
import { PaginationResult } from '../common/utils/pagination.util';
import { IUser } from 'src/common/interfaces/user.interface';
import { ImageUrls, UploadService } from '../upload/upload.service';
import { parseProfilePicture } from '../common/utils/parse-profile-picture.util';

@Injectable()
export class AdminsService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly uploadService: UploadService,
  ) {}

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

    const safeRows = rows.map((row) => {
      const { password, verification_code, ...safe } = row;
      return safe as Admin;
    });

    return {
      rows: safeRows,
      total: Number(total),
      limit,
      offset,
    };
  }

  async updateUser(id: string, user: IUser): Promise<IUser> {
    const [updatedUser] = await this.knex<IUser>('users')
      .where({ id: id })
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

  async getUsers(): Promise<PaginationResult<IUser>> {
    const users = (await this.knex('users')
      .select([
        'id',
        'first_name',
        'last_name',
        'phone_main',
        'phone_secondary',
        'phone_verified',
        'sap_card_code',
        'sap_card_name',
        'status',
        'profile_picture',
        'created_at',
        'updated_at',
        'device_token',
        'is_active',
        'language',
      ])
      .where('is_admin', false)
      .orderBy('created_at', 'desc')) as (IUser & { profile_picture: string | null })[];

    const [{ total }] = await this.knex<IUser>('users')
      .where('is_admin', false)
      .count({ total: '*' });

    const result = await Promise.all(
      users.map(async (row) => {
        const keys: ImageUrls | null = parseProfilePicture(row.profile_picture ?? null);
        const profile_picture_urls: ImageUrls | null = keys
          ? await this.uploadService.generateSignedUrls(keys, 3600)
          : null;

        const { password, profile_picture, ...safe } = row;
        return {
          ...safe,
          profile_picture_urls,
          role: 'user' as const,
        };
      }),
    );

    return {
      rows: result,
      total: Number(total),
      limit: result.length,
      offset: 0,
    };
  }

  async getUserDetails(id: string): Promise<IUser> {
    const row = (await this.knex('users')
      .select([
        'id',
        'first_name',
        'last_name',
        'phone_main',
        'phone_secondary',
        'phone_verified',
        'sap_card_code',
        'sap_card_name',
        'status',
        'profile_picture',
        'created_at',
        'updated_at',
        'device_token',
        'is_active',
        'language',
      ])
      .where({ id })
      .first()) as (IUser & { profile_picture: string | null }) | undefined;

    if (!row) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    const keys: ImageUrls | null = parseProfilePicture(row.profile_picture ?? null);

    const profile_picture_urls: ImageUrls | null = keys
      ? await this.uploadService.generateSignedUrls(keys, 3600)
      : null;

    const { password, profile_picture, ...safe } = row;

    return {
      ...safe,
      profile_picture_urls,
    };
  }

  async getUserById(id: string): Promise<IUser | NotFoundException> {
    const user = await this.knex<IUser>('users').where({ id }).first();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    return user;
  }
}
