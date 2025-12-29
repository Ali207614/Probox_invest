import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { RedisService } from '../redis/redis.service';

function pickPhoneMain(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const v = (body as Record<string, unknown>)['phone_main'];
  return typeof v === 'string' ? v : '';
}

@Injectable()
export class SendCodeRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ExpressRequest>();

    // req.body any → explicit cast bilan eslint tinchiydi
    const rawPhone = pickPhoneMain(req.body as unknown);
    const phone = this.normalizePhone(rawPhone);

    if (!phone) return true;

    const key = `rl:send_code:phone:${phone}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 60);
      return true;
    }

    const ttl = await this.redis.ttl(key);
    const retryAfter = Math.max(ttl, 1);

    throw new HttpException(
      {
        message: 'Too many requests. Please try again later.',
        location: 'auth_send_code_rate_limit',
        retry_after: retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private normalizePhone(input: string): string {
    const digits = input.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('998')) return `+${digits}`;
    if (digits.length === 9) return `+998${digits}`;
    return `+${digits}`;
  }
}
