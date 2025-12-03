import './config/env-loader';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor, BadRequestException } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SanitizationPipe } from './common/pipe/sanitization.pipe';
import { extractError } from './common/utils/validation.util';
import { LoggerService } from './common/logger/logger.service';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';
import type { Application as ExpressApp, RequestHandler } from 'express';

// Bull v3 (bull)
import { getQueueToken as getBullToken } from '@nestjs/bull';
import { Queue as BullQueue } from 'bull';
import { BullAdapter } from '@bull-board/api/bullAdapter';
// Bull Board UI
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';

const compressionMiddleware: RequestHandler = compression({ threshold: 1024 });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new LoggerService();

  const GLOBAL_PREFIX = 'api/v1';
  const HOST: string = process.env.HOST || '127.0.0.1';
  const PORT: number = Number(process.env.PORT) || 5001;

  // CORS
  app.enableCors({ origin: '*', credentials: true });

  // Security & perf
  app.use(helmet() as RequestHandler);
  app.use(compressionMiddleware);

  // Filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Pipes
  app.useGlobalPipes(
    new SanitizationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors): BadRequestException => {
        const { message, location } = extractError(errors);
        return new BadRequestException({
          message,
          error: 'ValidationError',
          location,
          timestamp: new Date().toISOString(),
          statusCode: 400,
        });
      },
    }),
  );

  // Prefix
  app.setGlobalPrefix(GLOBAL_PREFIX);

  // Basic auth: Queues & Swagger
  app.use(
    ['/admin/queues'],
    basicAuth({
      users: { [process.env.QUEUE_USER ?? 'admin']: process.env.QUEUE_PASS ?? 'admin' },
      challenge: true,
    }),
  );
  app.use(
    [`/${GLOBAL_PREFIX}/docs`],
    basicAuth({
      users: { [process.env.SWAGGER_USER || 'Admin']: process.env.SWAGGER_PASS || '1234' },
      challenge: true,
    }),
  );

  // Swagger
  const swaggerCfg = new DocumentBuilder()
    .setTitle('📱 Probox invest Admin API')
    .setDescription(
      `<b>Probox invest</b> is an online phone repair management platform.<br />
       This <b>Admin API</b> allows you to manage branches, repair orders, users, and related technical operations.`.trim(),
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      in: 'header',
      description: 'Enter your JWT token: <code>Bearer &lt;token&gt;</code>',
    })
    .build();

  const swaggerDoc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, swaggerDoc);

  // -------- Bull Board wiring --------
  // 1) Bull (v3) queue — sap
  let sapQueue: BullQueue | undefined;
  try {
    sapQueue = app.get<BullQueue>(getBullToken('sap'));
  } catch {
    logger.warn('[BullBoard] sap Bull queue DI orqali topilmadi (optional).');
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queuesAdapters = sapQueue ? [new BullAdapter(sapQueue)] : [];

  createBullBoard({
    queues: queuesAdapters,
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(PORT, HOST);
  const expressApp = app.getHttpAdapter().getInstance() as ExpressApp;
  expressApp.set('trust proxy', 1);

  logger.log(`http://${HOST}:${PORT}/${GLOBAL_PREFIX}`);
  logger.log(`Swagger: http://${HOST}:${PORT}/${GLOBAL_PREFIX}/docs`);
  logger.log(`Queues: http://${HOST}:${PORT}/admin/queues`);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap error:', err);
  process.exit(1);
});
