import { Controller, Get, Headers, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

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
}
