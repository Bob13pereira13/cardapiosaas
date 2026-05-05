import { Body, Controller, Post } from '@nestjs/common';
import { MetaConversionService } from './meta-conversion.service';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly metaConversionService: MetaConversionService) {}

  @Post('meta/event')
  sendMetaEvent(@Body() body: unknown) {
    if (!body || typeof body !== 'object') {
      return { sent: false, reason: 'invalid_payload' };
    }

    return this.metaConversionService.sendEvent(body);
  }
}
