import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
import { UsersService } from '../users/users.service';
import { IBusinessPartner } from '../common/interfaces/business-partner.interface';
import { IUser } from '../common/interfaces/user.interface';
import { SapService } from '../sap/hana/sap-hana.service';

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

  private readonly RESET_PREFIX = 'reset-code:';

  async sendVerificationCode(dto: SmsDto): Promise<{ message: string; code: string }> {
    const sapPartners: IBusinessPartner[] = await this.sapService.getBusinessPartnerByPhone(
      dto.phone_main,
    );

    if (!sapPartners || sapPartners.length === 0) {
      throw new NotFoundException({
        message: 'This phone number is not registered in SAP',
        location: 'sap_not_found',
      });
    }
    const sapPartner: IBusinessPartner = sapPartners[0];

    let user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

    if (user && user.status !== 'Pending') {
      throw new ConflictException({
        message: 'User already registered. Please login.',
        location: 'already_registered',
      });
    }

    if (!user) {
      user = await this.usersService.createUser({
        phone_main: dto.phone_main,
        phone_verified: false,
        status: 'Pending',
        sap_card_code: sapPartner.CardCode,
        sap_name: sapPartner.CardName,
      });
    }

    const code: string = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`verify:${user.phone_main}`, code, 300);

    return { message: 'Verification code sent successfully', code };
  }

  async verifyCode(dto: VerifyDto): Promise<{ message: string }> {
    const storedCode = await this.redisService.get(`verify:${dto.phone_main}`);

    if (!storedCode || storedCode !== dto.code) {
      throw new BadRequestException({
        message: 'Invalid verification code',
        location: 'invalid_code',
      });
    }

    await this.usersService.markPhoneVerified(dto.phone_main);
    await this.redisService.del(`verify:${dto.phone_main}`);

    return { message: 'Phone number verified successfully' };
  }

  async completeRegistration(dto: RegisterDto): Promise<{ access_token: string }> {
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
    });

    const payload = { id: user.id, phone_main: user.phone_main };
    const token: string = this.jwtService.sign(payload);

    await this.setUserSession(user.id, token);

    return { access_token: token };
  }

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    const user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        location: 'invalid_login',
      });
    }

    if (user.status === 'Pending') {
      throw new ForbiddenException({
        message: 'Registration incomplete. Please complete registration.',
        location: 'incomplete_registration',
      });
    }

    if (!(await bcrypt.compare(dto.password, user.password || ''))) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        location: 'invalid_login',
      });
    }

    const payload = { id: user.id, phone_main: user.phone_main };
    const token: string = this.jwtService.sign(payload);

    await this.setUserSession(user.id, token);

    return { access_token: token };
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

    await this.redisService.set(`blacklist:${token}`, '1', 60 * 60 * 24 * 7);

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; code: string }> {
    const user: IUser | undefined = await this.usersService.findByPhoneNumber(dto.phone_main);

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

    const code: string = Math.floor(100000 + Math.random() * 900000).toString();

    await this.redisService.set(`${this.RESET_PREFIX}${dto.phone_main}`, code, 300);

    console.log(`Reset code for ${dto.phone_main}: ${code}`);

    return {
      message: 'Reset code sent successfully',
      code,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const redisKey = `${this.RESET_PREFIX}${dto.phone_main}`;
    const code: string | null = await this.redisService.get(redisKey);

    if (!code || code !== dto.code) {
      throw new BadRequestException({
        message: 'Invalid or expired code',
        location: 'invalid_code',
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

    await this.redisService.del(redisKey);

    return { message: '✅ Password reset successfully' };
  }

  private async setUserSession(userId: string, token: string): Promise<void> {
    await this.redisService.set(`session:user:${userId}`, token, 60 * 60 * 24 * 7); // 7 days
  }
}
