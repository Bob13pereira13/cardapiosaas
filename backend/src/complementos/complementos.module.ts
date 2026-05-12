import { Module } from '@nestjs/common';
import {
  ComplementosController,
  OpcoesController,
} from './complementos.controller';
import { ComplementosService } from './complementos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplementosController, OpcoesController],
  providers: [ComplementosService],
})
export class ComplementosModule {}
