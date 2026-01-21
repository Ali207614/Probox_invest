import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { GetMeResponse, IUser } from '../common/interfaces/user.interface';
import { UserPayload } from '../common/interfaces/user-payload.interface';
import { ImageUrls, UploadService } from '../upload/upload.service';
import { parseProfilePicture } from '../common/utils/parse-profile-picture.util';

type BpProfileRow = {
  sap_card_code: string;
  profile_picture: string | null;
};

type UserDbRow = Omit<IUser, 'profile_picture_urls' | 'profile_picture' | 'password'> & {
  profile_picture: string | null;
  password?: string | null;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    private readonly uploadService: UploadService,
  ) {}

  private readonly table = 'users';

  private splitName(fullName: string | null | undefined): {
    first_name: string;
    last_name: string;
  } {
    if (!fullName) return { first_name: '', last_name: '' };
    const parts = fullName.trim().split(/\s+/);
    const first_name = parts[0] || '';
    const last_name = parts.slice(1).join(' ') || '';
    return { first_name, last_name };
  }

  async getMe(user: UserPayload): Promise<GetMeResponse> {
    const row = await this.knex<UserDbRow>(this.table)
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
      .where({ id: user.id })
      .first();

    if (!row) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    const keys: ImageUrls | null = parseProfilePicture(
      (row as { profile_picture: string | null }).profile_picture,
    );

    const profile_picture_urls: ImageUrls | null = keys
      ? await this.uploadService.generateSignedUrls(keys, 3600)
      : null;

    const { password, profile_picture, ...safe } = row as UserDbRow;

    if (!safe.first_name || !safe.last_name) {
      const { first_name, last_name } = this.splitName(safe.sap_card_name);
      if (!safe.first_name) safe.first_name = first_name;
      if (!safe.last_name) safe.last_name = last_name;
    }

    return {
      ...safe,
      profile_picture_urls,
    };
  }

  async createUser(data: {
    phone_main: string;
    phone_verified: boolean;
    status: 'Pending';
    sap_card_code?: string;
    sap_name?: string;
  }): Promise<IUser> {
    const { first_name, last_name } = this.splitName(data.sap_name);

    const user: IUser[] = await this.knex<IUser>(this.table)
      .insert({
        first_name,
        last_name,
        phone_main: data.phone_main,
        phone_verified: data.phone_verified,
        status: data.status,
        sap_card_code: data.sap_card_code,
        sap_card_name: data.sap_name,
        sap_phone_number: data.phone_main,
      })
      .returning('*');

    return user[0];
  }

  private normalizeCardCode(cardCode: string): string {
    const cc = (cardCode ?? '').trim();
    if (!cc) {
      throw new BadRequestException({
        message: 'CardCode is required',
        location: 'sap_card_code',
      });
    }
    return cc;
  }

  async uploadProfilePicture(
    user: UserPayload,
    cardCodeRaw: string,
    file: Express.Multer.File,
  ): Promise<{ urls: ImageUrls }> {
    const cardCode = this.normalizeCardCode(cardCodeRaw);

    const { keys, urls } = await this.uploadService.uploadBusinessPartnerProfilePicture(
      cardCode,
      file,
    );

    const now = new Date();

    await this.knex(this.table)
      .where({ sap_card_code: cardCode })
      .update({
        profile_picture: JSON.stringify(keys),
        updated_at: now,
      });

    return { urls };
  }

  async deleteProfilePicture(user: UserPayload, cardCodeRaw: string): Promise<{ message: string }> {
    const cardCode = this.normalizeCardCode(cardCodeRaw);

    const row: BpProfileRow | undefined = await this.knex<BpProfileRow>(this.table)
      .where({ sap_card_code: cardCode })
      .first();

    const keys: ImageUrls | null = parseProfilePicture(row?.profile_picture ?? null);
    if (!keys) {
      throw new BadRequestException({
        message: 'Profile picture not found',
        location: 'profile_picture_not_found',
      });
    }

    await this.uploadService.deleteImages(Object.values(keys));

    await this.knex(this.table).where({ sap_card_code: cardCode }).update({
      profile_picture: null,
      updated_at: new Date(),
    });

    return { message: 'Image deleted successfully.' };
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
    data: Partial<Pick<IUser, 'password' | 'status' | 'device_token'>>,
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
