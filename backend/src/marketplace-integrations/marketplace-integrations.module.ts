import { Module } from '@nestjs/common';
import { EncryptionModule } from '../encryption/encryption.module';
import { MarketplaceConnectorsModule } from '../marketplace-connectors/marketplace-connectors.module';
import { MarketplaceIntegrationsController } from './marketplace-integrations.controller';
import { MarketplaceIntegrationsService } from './marketplace-integrations.service';

@Module({
  imports: [EncryptionModule, MarketplaceConnectorsModule],
  controllers: [MarketplaceIntegrationsController],
  providers: [MarketplaceIntegrationsService],
})
export class MarketplaceIntegrationsModule {}
