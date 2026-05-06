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
      const payload = this.jwt.verify<{ sub: number }>(token);
      void client.join(`tenant:${payload.sub}`);
      void client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect() {}

  emitNewOrder(userId: number, order: unknown) {
    this.server.to(`tenant:${userId}`).emit('order:new', order);
  }

  emitStatusChanged(userId: number, orderId: number, status: string) {
    this.server
      .to(`tenant:${userId}`)
      .emit('order:status-changed', { orderId, status });
  }

  emitPaymentConfirmed(userId: number, orderId: number) {
    this.server
      .to(`tenant:${userId}`)
      .emit('order:payment-confirmed', { orderId });
  }

  emitWhatsappPrompt(
    userId: number,
    data: { orderId: number; customerPhone: string; customerName: string },
  ) {
    this.server.to(`user:${userId}`).emit('whatsapp:prompt', data);
  }
}
