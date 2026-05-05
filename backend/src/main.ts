import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

const startupLogger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if (!process.env.ASAAS_API_KEY) {
    startupLogger.warn(
      'ASAAS_API_KEY não configurada — pagamento Pix online desabilitado.',
    );
  }

  const uploadsPath = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath);
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.use(helmet());

  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    'https://cardapiopedeai.com.br,http://cardapiopedeai.com.br,https://www.cardapiopedeai.com.br,http://www.cardapiopedeai.com.br'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin(origin: string | undefined, callback: CorsCallback) {
      if (
        !origin ||
        corsOrigins.includes('*') ||
        corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      try {
        const hostname = new URL(origin).hostname;
        const allowCustomDomainOrigins =
          process.env.ALLOW_CUSTOM_DOMAIN_ORIGINS === 'true';
        const appHostname = process.env.APP_DOMAIN
          ? new URL(
              process.env.APP_DOMAIN.startsWith('http')
                ? process.env.APP_DOMAIN
                : `https://${process.env.APP_DOMAIN}`,
            ).hostname
          : undefined;

        if (appHostname && hostname.endsWith(appHostname)) {
          callback(null, true);
          return;
        }

        if (allowCustomDomainOrigins && origin.startsWith('https://')) {
          callback(null, true);
          return;
        }
      } catch {
        // Invalid origins are rejected below.
      }

      callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'asaas-access-token',
      'x-cardapio-host',
    ],
    credentials: true,
  });

  app.use('/uploads', express.static(uploadsPath));

  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
