export interface MarketplaceOrderItem {
  externalId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface MarketplaceOrder {
  externalId: string;
  items: MarketplaceOrderItem[];
  customerName: string;
  customerPhone: string;
  total: number;
  deliveryType: 'DELIVERY' | 'PICKUP';
  notes?: string;
}

export interface ConnectorTestResult {
  ok: boolean;
  message: string;
}

export interface IMarketplaceConnector {
  readonly marketplace: string;
  testConnection(
    authData: string,
    config: Record<string, unknown>,
  ): Promise<ConnectorTestResult>;
  fetchOrders(
    authData: string,
    config: Record<string, unknown>,
  ): Promise<MarketplaceOrder[]>;
  confirmOrder(
    externalId: string,
    authData: string,
    config: Record<string, unknown>,
  ): Promise<void>;
  cancelOrder(
    externalId: string,
    reason: string,
    authData: string,
    config: Record<string, unknown>,
  ): Promise<void>;
}
