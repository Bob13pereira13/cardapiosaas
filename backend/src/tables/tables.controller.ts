import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { AuthGuard } from '@nestjs/passport';
import { RestaurantScopeGuard } from '../auth/restaurant-scope.guard';
import { TablesService } from './tables.service';

type AuthenticatedRequest = {
  user: { id: number; activeRestaurantId: number };
};

@Controller('tables')
@UseGuards(AuthGuard('jwt'), RestaurantScopeGuard)
export class TablesController {
  constructor(private tables: TablesService) {}

  @Get() findAll(@Request() req: AuthenticatedRequest) {
    return this.tables.findAll(req.user.activeRestaurantId);
  }
  @Post() create(
    @Request() req: AuthenticatedRequest,
    @Body() body: { numero: number; nome?: string; capacidade?: number },
  ) {
    return this.tables.create(req.user.activeRestaurantId, body);
  }
  @Patch(':id') update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      numero?: number;
      nome?: string;
      capacidade?: number;
      ativa?: boolean;
    },
  ) {
    return this.tables.update(req.user.activeRestaurantId, Number(id), body);
  }
  @Delete(':id') remove(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.tables.remove(req.user.activeRestaurantId, Number(id));
  }

  @Get(':id/qrcode')
  async getQrCode(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const url = await this.tables.getQrCodeUrl(
      req.user.activeRestaurantId,
      Number(id),
    );
    const qr = await QRCode.toBuffer(url, { width: 400 });
    res.setHeader('Content-Type', 'image/png');
    res.end(qr);
  }
}
