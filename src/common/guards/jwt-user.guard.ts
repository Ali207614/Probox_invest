import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RedisService } from 'src/common/redis/redis.service';
import type { UserRequest } from 'src/common/types/request-user.type';
import type { UserPayload } from '../interfaces/user-payload.interface';

@Injectable()
export class JwtUserAuthGuard extends AuthGuard('jwt-user') {
  constructor(private readonly redisService: RedisService) {
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
        location: 'missing_authorization-user',
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

    return true;
  }
}
