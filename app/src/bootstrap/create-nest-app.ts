import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  Logger,
  type LogLevel,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import { AppModule } from '../app.module';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

type CreateNestAppOptions = {
  nodeEnv?: string;
  expressApp?: Express;
};

export async function createNestApp(
  options: CreateNestAppOptions = {},
): Promise<NestExpressApplication> {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'production';
  const isProduction = nodeEnv === 'production';

  const loggerLevels: LogLevel[] = isProduction
    ? ['error', 'log']
    : ['error', 'warn', 'log', 'debug', 'verbose'];

  const app = options.expressApp
    ? await NestFactory.create<NestExpressApplication>(
        AppModule,
        new ExpressAdapter(options.expressApp),
        { logger: loggerLevels },
      )
    : await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: loggerLevels,
      });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('DRM API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>('cors.origins') || [];
  const corsLogger = new Logger('CORS');

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      const isAllowed = corsOrigins.some((allowedOrigin) => {
        if (allowedOrigin.includes('*')) {
          const pattern = allowedOrigin.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return origin === allowedOrigin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        corsLogger.warn(
          `CORS: Missing Allow Origin - Request from "${origin}" was blocked. Allowed origins: ${JSON.stringify(corsOrigins)}`,
        );
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'DNT',
      'User-Agent',
      'X-Requested-With',
      'If-Modified-Since',
      'Cache-Control',
      'Content-Type',
      'Range',
      'Authorization',
    ],
    credentials: true,
  });

  await app.init();
  return app;
}
