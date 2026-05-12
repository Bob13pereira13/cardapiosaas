import { Injectable } from '@nestjs/common';
import { IMarketplaceConnector } from './interfaces/marketplace-connector.interface';

@Injectable()
export class MarketplaceConnectorRegistry {
  private readonly connectors = new Map<string, IMarketplaceConnector>();

  register(connector: IMarketplaceConnector): void {
    this.connectors.set(connector.marketplace, connector);
  }

  get(marketplace: string): IMarketplaceConnector | undefined {
    return this.connectors.get(marketplace);
  }

  has(marketplace: string): boolean {
    return this.connectors.has(marketplace);
  }
}
