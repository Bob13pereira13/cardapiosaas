import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import * as QRCode from 'qrcode';
import { DeliveryCheckService } from '../delivery-zones/delivery-check.service';
import { CheckDeliveryDto } from '../delivery-zones/dto/check-delivery.dto';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private publicService: PublicService,
    private deliveryCheck: DeliveryCheckService,
  ) {}

  @Get('cardapio/:slug')
  getCardapio(
    @Param('slug') slug: string,
    @Headers('x-cardapio-host') forwardedHost?: string,
    @Headers('host') host?: string,
  ) {
    return this.publicService.getCardapio(slug, forwardedHost || host);
  }

  @Get('order/:id')
  getOrder(@Param('id') id: string) {
    return this.publicService.getOrder(Number(id));
  }

  @Get('order/:id/status')
  getOrderStatus(@Param('id') id: string) {
    return this.publicService.getOrderStatus(Number(id));
  }

  @Get('qrcode/:slug')
  async getQrCode(@Param('slug') slug: string, @Res() res: Response) {
    const url = `${process.env.FRONTEND_URL}/cardapio/${slug}`;
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: 300,
      margin: 2,
    });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }

  @Get('qrcode/:slug/png')
  async getQrCodePng(@Param('slug') slug: string, @Res() res: Response) {
    const url = `${process.env.FRONTEND_URL}/cardapio/${slug}`;
    const buffer = await QRCode.toBuffer(url, { width: 600, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qrcode-${slug}.png"`,
    );
    res.send(buffer);
  }

  @Post('restaurants/:slug/check-delivery')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  checkDelivery(@Param('slug') slug: string, @Body() body: CheckDeliveryDto) {
    return this.deliveryCheck.check(slug, body.cep);
  }

  @Post('nps')
  submitNps(
    @Body() body: { orderId: number; score: number; comment?: string },
  ) {
    return this.publicService.submitNps(body);
  }
}
