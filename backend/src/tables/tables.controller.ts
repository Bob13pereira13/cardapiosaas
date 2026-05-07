import { Body, Controller, Delete, Get, Param, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { AuthGuard } from '@nestjs/passport';
import { TablesService } from './tables.service';

type AuthenticatedRequest = { user: { id: number } };

@Controller('tables')
@UseGuards(AuthGuard('jwt'))
export class TablesController {
  constructor(private tables: TablesService) {}

  @Get() findAll(@Request() req: AuthenticatedRequest) { return this.tables.findAll(req.user.id); }
  @Post() create(@Request() req: AuthenticatedRequest, @Body() body: { numero: number; nome?: string; capacidade?: number }) { return this.tables.create(req.user.id, body); }
  @Patch(':id') update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { numero?: number; nome?: string; capacidade?: number; ativa?: boolean }) { return this.tables.update(req.user.id, Number(id), body); }
  @Delete(':id') remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.tables.remove(req.user.id, Number(id)); }

  @Get(':id/qrcode')
  async getQrCode(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const url = await this.tables.getQrCodeUrl(req.user.id, Number(id));
    const qr = await QRCode.toBuffer(url, { width: 400 });
    res.setHeader('Content-Type', 'image/png');
    res.end(qr);
  }

  @Get(':id/comanda') getComanda(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.tables.getActiveComanda(req.user.id, Number(id)); }
  @Post(':id/comanda') openComanda(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.tables.openComanda(req.user.id, Number(id)); }
  @Post(':id/comanda/items') addItem(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { productId: number; quantidade: number; obs?: string }) { return this.tables.addItem(req.user.id, Number(id), body); }
  @Delete(':id/comanda/items/:itemId') removeItem(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Param('itemId') itemId: string) { return this.tables.removeItem(req.user.id, Number(id), Number(itemId)); }
  @Post(':id/comanda/close') closeComanda(@Request() req: AuthenticatedRequest, @Param('id') id: string) { return this.tables.closeComanda(req.user.id, Number(id)); }
  @Post(':id/comanda/transfer') transferComanda(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { toTableId: number }) { return this.tables.transferComanda(req.user.id, Number(id), body.toTableId); }
}
