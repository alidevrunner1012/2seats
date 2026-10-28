import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import type { Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true, rawBody: true },
  );
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  const config = app.get(ConfigService<Environment, true>);
  const allowedOrigins = new Set(config.get('CORS_ORIGINS', { infer: true }));
  await app.register(helmet);
  await app.register(cookie);
  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (origin === undefined || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'), false);
    },
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('2Seats API')
    .setDescription('API for cozy movie dates together')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(
      '2seats_refresh',
      {
        type: 'apiKey',
        in: 'cookie',
      },
      '2seats_refresh',
    )
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  app.enableShutdownHooks();
  await app.listen({
    port: config.get('PORT', { infer: true }),
    host: '0.0.0.0',
  });
}

void bootstrap();
