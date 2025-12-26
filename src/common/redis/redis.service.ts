import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from 'src/common/logger/logger.service';
import type { Redis as IORedisClient } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly prefix = process.env.REDIS_PREFIX || 'procare';
  private readonly rawThreshold = 100;

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: IORedisClient | null,
    private readonly logger: LoggerService,
  ) {}

  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private async ensureConnected(): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('⚠️ Redis client is null, skipping operation');
      return false;
    }

    try {
      const status = this.client.status;
      if (status !== 'ready') {
        await this.client.connect();
      }

      if (this.client.status !== 'ready') {
        this.logger.warn(`⚠️ Redis not ready (status=${String(this.client.status)}), skipping`);
        return false;
      }

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.warn(`⚠️ Redis connection failed: ${msg}`);
      return false;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!(await this.ensureConnected())) return;

    try {
      await this.client!.set(this.buildKey(key), JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.handleError(err, `Redis SET error for key=${key}`);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!(await this.ensureConnected())) return null;

    try {
      const data = await this.client!.get(this.buildKey(key));
      return data ? (JSON.parse(data) as T) : null;
    } catch (err) {
      this.handleError(err, `Redis GET error for key=${key}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureConnected())) return;

    try {
      await this.client!.del(this.buildKey(key));
    } catch (err) {
      this.handleError(err, `Redis DEL error for key=${key}`);
    }
  }

  async flushByPrefix(pattern: string, scanCount = 500): Promise<void> {
    if (!(await this.ensureConnected())) return;

    try {
      const fullPattern = this.buildKey(`${pattern}*`);
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.client!.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          scanCount,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client!.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.handleError(err, `Redis FLUSH error for pattern=${pattern}`);
    }
  }

  private handleError(error: unknown, context: string): void {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${msg}`);
  }
}
