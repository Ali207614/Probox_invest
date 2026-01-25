import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { RedisService } from 'src/common/redis/redis.service';
import type { UserPayload } from '../interfaces/user-payload.interface';
import type { UserRequest } from 'src/common/types/request-user.type';

@Injectable()
export class JwtRefreshAuthGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: UserRequest = context.switchToHttp().getRequest<UserRequest>();

    const authHeader: string | undefined = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Refresh token missing',
        location: 'missing_refresh_token',
      });
    }

    const token: string = authHeader.substring(7);

    // 1. Check if token exists and get associated userId
    const userId: string | null = await this.redisService.get<string | null>(
      `refresh_token:${token}`,
    );

    if (!userId) {
      throw new UnauthorizedException({
        message: 'Refresh token invalid or expired',
        location: 'invalid_refresh_session',
      });
    }

    // 2. Double check if this is the CURRENT active refresh token for this user
    const currentToken: string | null = await this.redisService.get<string | null>(
      `refresh:user:${userId}`,
    );
    if (currentToken !== token) {
      throw new UnauthorizedException({
        message: 'Refresh token has been rotated or invalidated',
        location: 'invalid_refresh_token',
      });
    }

    // 3. Attach the user payload manually since we're not using Passport for refresh anymore
    request.user = {
      id: userId,
    } as UserPayload;

    return true;
  }
}
