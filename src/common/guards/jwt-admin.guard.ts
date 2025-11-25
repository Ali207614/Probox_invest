import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/common/redis/redis.service';
import type { AdminRequest } from 'src/common/types/request-admin.type';

@Injectable()
export class JwtAdminAuthGuard extends AuthGuard('jwt-admin') {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await super.canActivate(context);
    if (!activated) return false;

    const request = context.switchToHttp().getRequest<AdminRequest>();
    const admin = request.user;

    if (!admin || !admin.id) {
      throw new UnauthorizedException({
        message: 'Invalid user data',
        location: 'invalid_user_data',
      });
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Authorization header missing or invalid',
        location: 'missing_authorization-admin',
      });
    }

    const token = authHeader.substring(7);

    const sessionKey = `session:admin:${admin.id}`;
    const activeToken = await this.redisService.get<string | null>(sessionKey);

    if (activeToken && activeToken !== token) {
      throw new UnauthorizedException({
        message: 'Session invalid or expired',
        location: 'invalid_session',
      });
    }

    const blacklistKey = `blacklist:token:${token}`;
    const isBlacklisted = await this.redisService.get<string | null>(blacklistKey);

    if (isBlacklisted) {
      throw new UnauthorizedException({
        message: 'Token has been blacklisted',
        location: 'blacklisted_token',
      });
    }

    request.admin = {
      id: admin.id,
      phone_number: admin.phone_number,
      roles: Array.isArray(admin.roles) ? admin.roles : [],
    };

    return true;
  }
}
