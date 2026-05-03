import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('cardapio/:slug')
  getCardapio(@Param('slug') slug: string) {
    return this.publicService.getCardapio(slug);
  }
}