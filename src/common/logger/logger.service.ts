import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack }) => {
          const safeTimestamp = typeof timestamp === 'string' ? timestamp : String(timestamp);

          const safeMessage = typeof message === 'string' ? message : JSON.stringify(message);

          const safeStack =
            typeof stack === 'string'
              ? `\n${stack}`
              : stack
                ? `\n${JSON.stringify(stack, null, 2)}`
                : '';

          return `[${safeTimestamp}] ${String(level).toUpperCase()}: ${safeMessage}${safeStack}`;
        }),
      ),
      transports: [
        new transports.Console(),

        new DailyRotateFile({
          dirname: 'logs',
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),

        new DailyRotateFile({
          dirname: 'logs',
          filename: 'error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
        }),
      ],
    });
  }

  log(message: string): void {
    this.logger.info(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(message, trace ? { stack: trace } : undefined);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  verbose(message: string): void {
    this.logger.verbose(message);
  }
}
