import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Knex } from 'knex';
import { InjectKnex } from 'nestjs-knex';
import { RedisService } from 'src/common/redis/redis.service';
import type { UserRequest } from 'src/common/types/request-user.type';
import type { UserPayload } from '../interfaces/user-payload.interface';
import type { IUser } from '../interfaces/user.interface';

@Injectable()
export class AdminsAuthGuard extends AuthGuard('jwt-user') {
  constructor(
    private readonly redisService: RedisService,
    @InjectKnex() private readonly knex: Knex,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const can = (await super.canActivate(context)) as boolean;
    if (!can) return false;

    const request: UserRequest = context.switchToHttp().getRequest<UserRequest>();
    const user: UserPayload | undefined = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException({
        message: 'Unauthorized: Invalid or missing token',
        location: 'invalid_token',
      });
    }

    const authHeader: string | undefined = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Authorization header missing or invalid',
        location: 'missing_authorization-admin',
      });
    }

    const token: string = authHeader.substring(7);
    const sessionKey = `session:user:${user.id}`;
    const storedToken: string | null = await this.redisService.get<string | null>(sessionKey);

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedException({
        message: 'Session invalid or expired',
        location: 'invalid_session',
      });
    }

    const blacklistKey = `blacklist:token:${token}`;
    const isBlacklisted: string | null = await this.redisService.get<string | null>(blacklistKey);

    if (isBlacklisted) {
      throw new UnauthorizedException({
        message: 'Token has been blacklisted',
        location: 'blacklisted_token',
      });
    }

    // Check if the user is an admin
    const dbUser = await this.knex<IUser>('users')
      .select('is_admin')
      .where({ id: user.id })
      .first();

    if (!dbUser) {
      throw new UnauthorizedException({
        message: 'User not found',
        location: 'user_not_found',
      });
    }

    if (!dbUser.is_admin) {
      throw new UnauthorizedException({
        message: 'Access denied: Admin privileges required',
        location: 'not_admin',
      });
    }

    return true;
  }
}
