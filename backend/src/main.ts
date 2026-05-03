import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const uploadsPath = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath);
  }

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  app.use('/uploads', express.static(uploadsPath));

  await app.listen(process.env.PORT || 3000);
}

bootstrap();