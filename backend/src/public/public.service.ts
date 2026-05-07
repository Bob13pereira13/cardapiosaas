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
      disponibilidadeAtiva: true,
      disponibilidadeInicio: true,
      disponibilidadeFim: true,
      disponibilidadeDias: true,
      optionGroups: {
        orderBy: { ordem: 'asc' as const },
        include: {
          optionGroup: {
            include: {
              options: { where: { available: true }, orderBy: { displayOrder: 'asc' as const } },
            },
          },
        },
      },
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

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    function isProductAvailableNow(product: { disponibilidadeAtiva?: boolean; disponibilidadeInicio?: string | null; disponibilidadeFim?: string | null; disponibilidadeDias?: number[] }): boolean {
      if (!product.disponibilidadeAtiva) return true;
      if (product.disponibilidadeDias && !product.disponibilidadeDias.includes(currentDay)) return false;
      if (product.disponibilidadeInicio && product.disponibilidadeFim) {
        return currentTime >= product.disponibilidadeInicio && currentTime <= product.disponibilidadeFim;
      }
      return true;
    }

    const normalizeProduct = (product: any) => ({
      ...product,
      optionGroups: (product.optionGroups ?? [])
        .map((link: any) => link.optionGroup)
        .filter((group: any) => group?.ativo !== false),
    });

    const categoriesFiltered = allCategories.map((cat) => ({
      ...cat,
      products: cat.products.filter((p: any) => isProductAvailableNow(p)).map(normalizeProduct),
    }));

    const categories = categoriesFiltered.filter((c) => c.products.length > 0);

    const combos = await this.prisma.combo.findMany({
      where: { userId: user.id, ativo: true },
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        descricao: true,
        preco: true,
        imagem: true,
        items: {
          select: {
            quantidade: true,
            product: { select: { id: true, nome: true, preco: true, imagem: true } },
          },
        },
      },
    });

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
      combos,
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
            selectedOptions: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return order;
  }

  async submitNps(body: { orderId: number; score: number; comment?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: body.orderId },
      select: { id: true, userId: true, customerId: true },
    });
    if (!order) return { received: true };
    await this.prisma.npsResponse.create({
      data: {
        userId: order.userId,
        customerId: order.customerId,
        orderId: order.id,
        score: body.score,
        comment: body.comment,
      },
    });
    if (order.id) {
      await this.prisma.order.update({ where: { id: order.id }, data: { npsRequested: true } });
    }
    return { received: true };
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
