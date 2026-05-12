import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private jwt: JwtService) {}

  handleConnection(client: Socket) {
    const raw = client.handshake.auth?.token as string | undefined;
    if (!raw) {
      client.disconnect();
      return;
    }
    try {
      const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
      const payload = this.jwt.verify<{
        sub: number;
        activeRestaurantId?: number;
      }>(token);
      const roomId = payload.activeRestaurantId ?? payload.sub;
      void client.join(`restaurant:${roomId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  emitNewOrder(restaurantId: number, order: unknown) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:new', order);
  }

  emitStatusChanged(restaurantId: number, orderId: number, status: string) {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order:status-changed', { orderId, status });
  }

  emitPaymentConfirmed(restaurantId: number, orderId: number) {
    this.server
      .to(`restaurant:${restaurantId}`)
      .emit('order:payment-confirmed', { orderId });
  }

  emitWhatsappPrompt(
    restaurantId: number,
    data: { orderId: number; customerPhone: string; customerName: string },
  ) {
    this.server.to(`restaurant:${restaurantId}`).emit('whatsapp:prompt', data);
  }
}
