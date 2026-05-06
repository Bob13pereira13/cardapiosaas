import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('payments')
export class PaymentsController {
  constructor(private prisma: PrismaService) {}

  @Post('order/:orderId/pix')
  async createPixPayment(@Param('orderId') orderId: string) {
    const id = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        paymentStatus: true,
        pixQrCode: true,
        pixCopyPaste: true,
        total: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    if (order.pixCopyPaste || order.pixQrCode) return order;

    return this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod: 'ONLINE_PIX',
        paymentStatus: 'PENDING',
        pixCopyPaste: `PIX-DEMO-PEDIDO-${id}`,
        pixQrCode: null,
      },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        pixQrCode: true,
        pixCopyPaste: true,
        total: true,
      },
    });
  }

  @Post('order/:orderId/card')
  async createCardPayment(@Param('orderId') orderId: string) {
    const id = Number(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');

    return this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod: 'ONLINE_CARD',
        paymentStatus: 'PENDING',
      },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
      },
    });
  }

  @Get('order/:orderId/status')
  async getPaymentStatus(@Param('orderId') orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: {
        id: true,
        paymentStatus: true,
        paymentMethod: true,
        pixQrCode: true,
        pixCopyPaste: true,
        total: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }
}
