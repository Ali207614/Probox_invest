import axios from 'axios';
import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { SmsDto } from './dto/sms.dto';
import { RedisService } from 'src/common/redis/redis.service';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SetPinDto } from './dto/set-pin.dto';
import { ForgotPinDto } from './dto/forgot-pin.dto';
import { VerifyPinOtpDto } from './dto/verify-pin-otp.dto';
import { ResetPinDto } from './dto/reset-pin.dto';
import { UsersService } from '../users/users.service';
import { IUser } from '../common/interfaces/user.interface';
import { SapService } from '../sap/hana/sap-hana.service';
import { SendCode, SendCodeResponse } from '../common/types/send-code.type';
import { normalizeUzPhone } from '../common/utils/uz-phone.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectKnex() private readonly knex: Knex,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly sapService: SapService,
  ) {}

  private readonly REDIS_PREFIX = {
    verify: 'verify',

    reset: 'reset-code',
    pin_reset: 'pin-reset-code',
  };

  private readonly ACCESS_TOKEN_EXPIRES = '30d'; // 30 days
  private readonly REFRESH_TOKEN_EXPIRES_SECONDS = 60 * 60 * 24 * 31; // 31 days

  private generateTokens(user: IUser): { access_token: string; refresh_token: string } {
    const accessPayload = {
      id: user.id,
      phone_main: user.phone_main,
      sap_card_code: user.sap_card_code,
      type: 'access',
    };

    const access_token = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });

    // Refresh token is now a long random string (64 bytes hex = 128 chars)
    const refresh_token = crypto.randomBytes(64).toString('hex');

    return { access_token, refresh_token };
  }

  async sendCode(phone: string, type: 'verify' | 'reset' | 'pin_reset'): Promise<SendCode> {
    const rateLimitKey = `rl:send_code:phone:${phone}`;
    const ttl = await this.redisService.ttl(rateLimitKey);

    if (ttl > 0) {
      throw new HttpException(
        {
          message: 'Too many requests. Please try again later.',
          location: 'auth_send_code_rate_limit',
          retry_after: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code: string = Math.floor(100000 + Math.random() * 900000).toString();

    const EXPIRES_IN = 300;
    const RETRY_AFTER = 60;

    const { last9: fixed_phone } = normalizeUzPhone(phone);

    const message_id =
      Array.from({ length: 3 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)),
      ).join('') +
      Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, '0');

    await this.redisService.set(`${this.REDIS_PREFIX[type]}:${phone}`, code, EXPIRES_IN);

    const data_to_send = {
      recipient: Number(fixed_phone),
      'message-id': message_id,
      sms: {
        originator: process.env.SMS_ORIGINATOR,
        content: {
          text: `Tasdiqlash kodi: ${code}\nKod faqat siz uchun. Uni boshqalarga bermang.`,
        },
      },
    };
    const sms_creadentials = {
      username: process.env.SMS_USERNAME || '',
      password: process.env.SMS_PASSWORD || '',
    };

    console.log(data_to_send);
    console.log(sms_creadentials);

    if (process.env.NODE_ENV !== 'development' && process.env.SMS_API_URL) {
      await axios.post(
        process.env.SMS_API_URL,
        {
          messages: data_to_send,
        },
        {
          auth: sms_creadentials,
        },
      );
    }

    // Set rate limit only after successful sending (or skipping in dev)
    await this.redisService.set(rateLimitKey, '1', RETRY_AFTER);

    const expiresAt = new Date(Date.now() + EXPIRES_IN * 1000).toISOString();

    const res: SendCode = {
      message: 'Verification code sent successfully',
      expires_in: EXPIRES_IN,
      expires_at: expiresAt,
      retry_after: RETRY_AFTER,
    };

    if (process.env.NODE_ENV !== 'production') {
      res.code = code;
    }

    return res;
  }

  async sendVerificationCode(dto: SmsDto): Promise<SendCodeResponse> {
    const { raw: phone } = normalizeUzPhone(dto.phone_main);

    const user: IUser | undefined = await this.usersService.findByPhoneNumber(phone);

    if (user && user.status !== 'Pending') {
      throw new ConflictException({
        message: 'User already registered. Please login.',
        location: 'already_registered',
      });
    }

    if (!user) {
      const sapPartners = await this.sapService.getBusinessPartnerByPhone(phone);

      if (!sapPartners?.length) {
        throw new NotFoundException({
          message: 'This phone number is not registered in SAP',
          location: 'sap_not_found',
        });
      }

      const sapPartner = sapPartners[0];

      console.table(sapPartner);

      await this.usersService.createUser({
        phone_main: phone,
        phone_verified: false,
        status: 'Pending',
        sap_card_code: sapPartner.CardCode,
        sap_name: sapPartner.CardName,
        is_admin: sapPartner.U_admin === 'yes',
      });
    }

    const { code, expires_in, expires_at, retry_after } = await this.sendCode(phone, 'verify');

    const res: SendCodeResponse = {
      message: 'Verification code sent successfully',
      data: {
        expires_in,
        expires_at,
        retry_after,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      res.code = code;
    }

    return res;
  }

  async verifyCode(dto: VerifyDto): Promise<{ message: string }> {
    const storedCode = await this.redisService.get(`${this.REDIS_PREFIX.verify}:${dto.phone_main}`);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException({
        message: 'Invalid verification code',
        location: 'invalid_code',
      });
    }

    await this.usersService.markPhoneVerified(dto.phone_main);
    await this.redisService.del(`${this.REDIS_PREFIX.verify}:${dto.phone_main}`);

    return { message: 'Phone number verified successfully' };
  }

  async verifyResetCode(dto: VerifyDto): Promise<{ reset_token: string }> {
    const redisKey = `${this.REDIS_PREFIX.reset}:${dto.phone_main}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException({
        message: 'Invalid or expired code',
        location: 'invalid_code',
      });
    }

    // Bir martalik xavfsiz kodni generatsiya qilish
    const resetToken = crypto.randomUUID();
    // Kodni redisga saqlash (10 minut)
    await this.redisService.set(`reset_token:${resetToken}`, dto.phone_main, 600);

    // SMS kodini redisdan o'chirish
    await this.redisService.del(redisKey);

    return { reset_token: resetToken };
  }

  async completeRegistration(
    dto: RegisterDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found.',
        location: 'user_not_found',
      });
    }

    if (user.status !== 'Pending') {
      throw new ConflictException({
        message: 'User already completed registration.',
        location: 'already_registered',
      });
    }

    if (!user.phone_verified) {
      throw new BadRequestException({
        message: 'Phone number not verified.',
        location: 'phone_not_verified',
      });
    }

    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException({
        message: 'Passwords do not match',
        location: 'confirm_password',
      });
    }

    const hashedPassword: string = await bcrypt.hash(dto.password, 10);

    await this.usersService.updateUserByPhone(dto.phone_main, {
      password: hashedPassword,
      status: 'Open',
      device_token: dto.device_token,
    });

    const tokens = this.generateTokens(user);

    await this.setUserSession(user.id, tokens.access_token);
    await this.setRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async login(dto: LoginDto): Promise<{ access_token: string; refresh_token: string }> {
    const user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

    if (user) {
      if (user.status === 'Pending') {
        throw new ForbiddenException({
          message: 'Registration incomplete. Please complete registration.',
          location: 'incomplete_registration',
        });
      }

      if (await bcrypt.compare(dto.password, user.password || '')) {
        if (user.device_token !== dto.device_token) {
          await this.knex('users')
            .where({
              id: user.id,
            })
            .update({ device_token: dto.device_token });
        }

        const tokens = this.generateTokens(user);

        await this.setUserSession(user.id, tokens.access_token);
        await this.setRefreshToken(user.id, tokens.refresh_token);

        return tokens;
      }
    }

    throw new UnauthorizedException({
      message: 'Invalid credentials',
      location: 'invalid_login',
    });
  }

  async logout(userId: string, token: string): Promise<{ message: string }> {
    const sessionKey = `session:user:${userId}`;

    const exists = await this.redisService.get(sessionKey);

    if (!exists) {
      throw new UnauthorizedException({
        message: 'Session not found',
        location: 'no_active_session',
      });
    }

    await this.redisService.del(sessionKey);

    await this.redisService.set(`blacklist:token:${token}`, '1', 60 * 60 * 24 * 7);

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<SendCodeResponse> {
    const { raw: phone } = normalizeUzPhone(dto.phone_main);

    const user = await this.usersService.findByPhoneNumber(phone);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    if (user.status !== 'Open') {
      throw new ForbiddenException({
        message: 'Password reset is only allowed for registered users',
        location: 'not_registered',
      });
    }

    const { code, expires_in, expires_at, retry_after } = await this.sendCode(phone, 'reset');

    const res: SendCodeResponse = {
      message: 'Reset code sent successfully',
      data: {
        expires_in,
        expires_at,
        retry_after,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      res.code = code;
    }

    return res;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

    if (!user || user.phone_verified) {
      throw new NotFoundException({
        message: 'User not found or phone not verified',
        location: 'user_not_found',
      });
    }

    const storedPhone = await this.redisService.get(`reset_token:${dto.reset_token}`);

    if (!storedPhone || storedPhone !== dto.phone_main) {
      throw new ForbiddenException({
        message: 'Invalid or expired reset session',
        location: 'invalid_token',
      });
    }

    if (dto.new_password !== dto.confirm_new_password) {
      throw new BadRequestException({
        message: 'Passwords do not match',
        location: 'confirm_password',
      });
    }

    const hashed: string = await bcrypt.hash(dto.new_password, 10);

    await this.knex<IUser>('users')
      .where({ phone_main: dto.phone_main })
      .update({ password: hashed, updated_at: new Date().toISOString() });

    // Reset tokenni redisdan o'chirish
    await this.redisService.del(`reset_token:${dto.reset_token}`);

    return { message: '✅ Password reset successfully' };
  }

  private async setUserSession(userId: string, token: string): Promise<void> {
    await this.redisService.set(`session:user:${userId}`, token, 60 * 60 * 24); // 1 day
  }

  private async setRefreshToken(userId: string, token: string): Promise<void> {
    // Store token -> userId mapping for lookup
    await this.redisService.set(
      `refresh_token:${token}`,
      userId,
      this.REFRESH_TOKEN_EXPIRES_SECONDS,
    );
    // Also keep user -> token mapping (useful for revoking all tokens for a user)
    await this.redisService.set(
      `refresh:user:${userId}`,
      token,
      this.REFRESH_TOKEN_EXPIRES_SECONDS,
    );
  }

  async refreshAccessToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.knex<IUser>('users').where({ id: userId }).first();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    if (user.status !== 'Open') {
      throw new ForbiddenException({
        message: 'User account is not active',
        location: 'account_not_active',
      });
    }

    const accessPayload = {
      id: user.id,
      phone_main: user.phone_main,
      sap_card_code: user.sap_card_code,
      type: 'access',
    };

    const access_token = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });

    await this.setUserSession(user.id, access_token);

    return { access_token };
  }

  async setPin(userId: string, dto: SetPinDto): Promise<{ message: string }> {
    const user = await this.knex<IUser>('users').where({ id: userId }).first();

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    if (dto.pin !== dto.confirm_pin) {
      throw new BadRequestException({
        message: 'PINs do not match',
        location: 'confirm_pin',
      });
    }

    const hashedPin = await bcrypt.hash(dto.pin, 10);

    await this.knex('users')
      .where({ id: userId })
      .update({ pin_code: hashedPin, updated_at: new Date().toISOString() });

    return { message: 'PIN created' };
  }

  async forgotPin(dto: ForgotPinDto): Promise<SendCodeResponse> {
    const { raw: phone } = normalizeUzPhone(dto.phone_main);

    const { code, expires_in, expires_at, retry_after } = await this.sendCode(phone, 'pin_reset');

    const res: SendCodeResponse = {
      message: 'PIN reset code sent successfully',
      data: {
        expires_in,
        expires_at,
        retry_after,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      res.code = code;
    }

    return res;
  }

  async verifyPinResetCode(dto: VerifyPinOtpDto): Promise<{ reset_token: string }> {
    const redisKey = `${this.REDIS_PREFIX.pin_reset}:${dto.phone_main}`;
    const storedCode = await this.redisService.get(redisKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException({
        message: 'Invalid or expired code',
        location: 'invalid_code',
      });
    }

    const resetToken = crypto.randomUUID();
    await this.redisService.set(`pin_reset_token:${resetToken}`, dto.phone_main, 600);

    await this.redisService.del(redisKey);

    return { reset_token: resetToken };
  }

  async resetPin(dto: ResetPinDto): Promise<{ message: string }> {
    const storedPhone = await this.redisService.get(`pin_reset_token:${dto.reset_token}`);

    if (!storedPhone || storedPhone !== dto.phone_main) {
      throw new ForbiddenException({
        message: 'Invalid token or mismatch',
        location: 'invalid_token',
      });
    }

    if (dto.new_pin !== dto.confirm_pin) {
      throw new BadRequestException({
        message: 'PINs do not match',
        location: 'confirm_pin',
      });
    }

    const hashedPin = await bcrypt.hash(dto.new_pin, 10);

    await this.knex('users')
      .where({ phone_main: dto.phone_main })
      .update({ pin_code: hashedPin, updated_at: new Date().toISOString() });

    await this.redisService.del(`pin_reset_token:${dto.reset_token}`);

    return { message: 'PIN updated' };
  }
}
