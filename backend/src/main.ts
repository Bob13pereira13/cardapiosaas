import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  const uploadsPath = join(process.cwd(), 'uploads');

  app.use('/uploads', express.static(uploadsPath));

  await app.listen(3000);
}

bootstrap();