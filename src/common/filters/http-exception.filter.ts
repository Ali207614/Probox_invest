import { Catch, ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { DatabaseError } from 'pg';
import { LoggerService } from '../logger/logger.service';
import { parsePgError } from '../utils/pg-error.util';

interface BaseErrorResponse {
  message?: string | string[];
  error?: string;
  location?: string;
  [key: string]: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Default values
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Unexpected error';
    let errorType = 'InternalServerError';

    //----------------------------------------------------------------------
    // 1. DATABASE ERRORS (PostgreSQL)
    //----------------------------------------------------------------------
    if (exception instanceof DatabaseError) {
      const parsed = parsePgError(exception);

      this.logger.error(
        `[${req.method}] ${req.url} - ${parsed.status} → ${parsed.message}`,
        exception.stack,
      );

      res.status(parsed.status).json({
        statusCode: parsed.status,
        message: parsed.message,
        error: parsed.errorType,
        location: parsed.location,
        timestamp: new Date().toISOString(),
        path: req.url,
      });
      return;
    }

    //----------------------------------------------------------------------
    // 2. HTTP EXCEPTIONS (NestJS)
    //----------------------------------------------------------------------
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // variant: string
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorType = exception.name;
      }

      // variant: object
      else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const data = exceptionResponse as BaseErrorResponse;

        // message: string or string[]
        if (Array.isArray(data.message)) {
          message = data.message.join(', ');
          errorType = 'ValidationError';
        } else if (typeof data.message === 'string') {
          message = data.message;
          errorType = data.error ?? exception.name;
        } else {
          errorType = data.error ?? exception.name;
        }
      }
    }

    //----------------------------------------------------------------------
    // 3. SPECIAL HTTP STATUSES
    //----------------------------------------------------------------------
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      message = 'Too many requests, please try again later.';
      errorType = 'RateLimitExceeded';
    }

    if (status === HttpStatus.NOT_FOUND) {
      errorType = 'NotFound';
    }

    //----------------------------------------------------------------------
    // 4. BUILD FINAL RESPONSE
    //----------------------------------------------------------------------
    const finalErrorResponse = {
      statusCode: status,
      message,
      error: errorType,
      location: this.extractLocation(exception),
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    //----------------------------------------------------------------------
    // 5. LOGGING
    //----------------------------------------------------------------------
    const logLine = `[${req.method}] ${req.url} - ${status} → ${message}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const shortMessage =
        exception instanceof Error ? `${exception.name}: ${exception.message}` : message;

      const stack = exception instanceof Error ? exception.stack : undefined;

      this.logger.error(`${logLine} → ${shortMessage}`, stack);
    } else {
      this.logger.warn(logLine);
    }

    //----------------------------------------------------------------------
    // 6. SEND RESPONSE
    //----------------------------------------------------------------------
    res.status(status).json(finalErrorResponse);
  }

  //----------------------------------------------------------------------
  // Extract `location` field if exists in HttpException response
  //----------------------------------------------------------------------
  private extractLocation(exception: unknown): string | null {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null && 'location' in res) {
        return (res as BaseErrorResponse).location ?? null;
      }
    }

    return null;
  }
}
