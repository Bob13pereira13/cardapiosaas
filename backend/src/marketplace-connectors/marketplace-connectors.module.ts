import { Module } from '@nestjs/common';
import { MarketplaceConnectorRegistry } from './marketplace-connector.registry';

@Module({
  providers: [MarketplaceConnectorRegistry],
  exports: [MarketplaceConnectorRegistry],
})
export class MarketplaceConnectorsModule {}
