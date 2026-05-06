import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  private normalizeHost(host?: string) {
    return host
      ?.split(':')[0]
      ?.trim()
      .toLowerCase()
      .replace(/^www\./, '');
  }

  async getCardapio(slug: string, host?: string) {
    const productSelect = {
      id: true,
      nome: true,
      descricao: true,
      preco: true,
      imagem: true,
      categoryId: true,
    };

    const onlyAvailable = { disponivel: true };

    const normalizedHost = this.normalizeHost(host);
    const user = await this.prisma.user.findFirst({
      where:
        normalizedHost && slug === 'domain'
          ? {
              customDomain: normalizedHost,
            }
          : { slug },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        gtmId: true,
        ga4MeasurementId: true,
        metaPixelId: true,
        customDomain: true,
        customDomainVerified: true,
        customDomainStatus: true,
        categories: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            nome: true,
            products: {
              where: onlyAvailable,
              orderBy: { id: 'asc' },
              take: 100,
              select: productSelect,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Cardápio não encontrado');
    }

    const uncategorized = await this.prisma.product.findMany({
      where: { userId: user.id, categoryId: null, disponivel: true },
      orderBy: { id: 'asc' },
      take: 100,
      select: productSelect,
    });

    const allCategories =
      uncategorized.length > 0
        ? [
            ...user.categories,
            { id: 0, nome: 'Outros', products: uncategorized },
          ]
        : user.categories;

    const categories = allCategories.filter((c) => c.products.length > 0);

    return {
      nome: user.nome,
      whatsapp: user.whatsapp,
      slug: user.slug,
      logo: user.logo,
      banner: user.banner,
      aberto: user.aberto,
      horarioAbertura: user.horarioAbertura,
      horarioFechamento: user.horarioFechamento,
      corPrimaria: user.corPrimaria,
      gtmId: user.gtmId,
      ga4MeasurementId: user.ga4MeasurementId,
      metaPixelId: user.metaPixelId,
      customDomain: user.customDomain,
      customDomainVerified: user.customDomainVerified,
      customDomainStatus: user.customDomainStatus,
      categories,
    };
  }

  async getOrder(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        paymentMethod: true,
        deliveryType: true,
        customerName: true,
        customerAddress: true,
        subtotal: true,
        deliveryFee: true,
        discountAmount: true,
        total: true,
        notes: true,
        pixQrCode: true,
        pixCopyPaste: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productNameSnapshot: true,
            quantity: true,
            unitPrice: true,
            itemTotal: true,
            itemNotes: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async getOrderStatus(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        total: true,
        deliveryType: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productNameSnapshot: true,
            quantity: true,
            itemTotal: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }
}
