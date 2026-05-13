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
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const productSelect = {
      id: true,
      nome: true,
      descricao: true,
      preco: true,
      imagem: true,
      categoryId: true,
      productComplements: {
        where: { complement: { isActive: true, deletedAt: null } },
        orderBy: { sortOrder: 'asc' as const },
        include: {
          complement: {
            select: {
              id: true,
              name: true,
              description: true,
              selectionRule: true,
              priceMode: true,
              minSelections: true,
              maxSelections: true,
              visibility: true,
              complementOptions: {
                where: { isVisible: true },
                orderBy: { sortOrder: 'asc' as const },
                include: {
                  option: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      imageUrl: true,
                      stockStatus: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const onlyAvailable = {
      disponivel: true,
      OR: [
        { availabilities: { none: {} } },
        {
          availabilities: {
            some: {
              dayOfWeek: currentDay,
              startTime: { lte: currentTime },
              endTime: { gte: currentTime },
            },
          },
        },
      ],
    };

    const normalizedHost = this.normalizeHost(host);
    const restaurant = await this.prisma.restaurant.findFirst({
      where:
        normalizedHost && slug === 'domain'
          ? { customDomain: normalizedHost }
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

    if (!restaurant) {
      throw new NotFoundException('Cardápio não encontrado');
    }

    const uncategorized = await this.prisma.product.findMany({
      where: {
        restaurantId: restaurant.id,
        categoryId: null,
        ...onlyAvailable,
      },
      orderBy: { id: 'asc' },
      take: 100,
      select: productSelect,
    });

    const allCategories =
      uncategorized.length > 0
        ? [
            ...restaurant.categories,
            { id: 0, nome: 'Outros', products: uncategorized },
          ]
        : restaurant.categories;

    const normalizeProduct = (product: any) => {
      const { productComplements, ...rest } = product;
      return {
        ...rest,
        complements: (productComplements ?? [])
          .map((link: any) => ({
            ...link.complement,
            sortOrder: link.sortOrder,
          }))
          .filter((c: any) => c.isActive !== false),
      };
    };

    const categoriesFiltered = allCategories.map((cat) => ({
      ...cat,
      products: cat.products.map(normalizeProduct),
    }));

    const categories = categoriesFiltered.filter((c) => c.products.length > 0);

    const combos = await this.prisma.combo.findMany({
      where: { restaurantId: restaurant.id, ativo: true },
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
            product: {
              select: { id: true, nome: true, preco: true, imagem: true },
            },
          },
        },
      },
    });

    return {
      nome: restaurant.nome,
      whatsapp: restaurant.whatsapp,
      slug: restaurant.slug,
      logo: restaurant.logo,
      banner: restaurant.banner,
      aberto: restaurant.aberto,
      horarioAbertura: restaurant.horarioAbertura,
      horarioFechamento: restaurant.horarioFechamento,
      corPrimaria: restaurant.corPrimaria,
      gtmId: restaurant.gtmId,
      ga4MeasurementId: restaurant.ga4MeasurementId,
      metaPixelId: restaurant.metaPixelId,
      customDomain: restaurant.customDomain,
      customDomainVerified: restaurant.customDomainVerified,
      customDomainStatus: restaurant.customDomainStatus,
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
        deliveryType: true,
        customerName: true,
        customerAddress: true,
        subtotal: true,
        deliveryFee: true,
        discountAmount: true,
        total: true,
        notes: true,
        createdAt: true,
        tab: {
          select: {
            payments: {
              where: { status: 'CONFIRMED' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { metodo: true, status: true },
            },
          },
        },
        items: {
          select: {
            id: true,
            productNameSnapshot: true,
            quantity: true,
            unitPrice: true,
            itemTotal: true,
            itemNotes: true,
            selectedComplements: {
              select: {
                id: true,
                complementNameSnapshot: true,
                selectionRuleSnapshot: true,
                selectedOptions: {
                  select: {
                    id: true,
                    optionNameSnapshot: true,
                    optionPriceSnapshot: true,
                    quantity: true,
                  },
                },
              },
            },
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
      select: { id: true, restaurantId: true, customerId: true },
    });
    if (!order) return { received: true };
    await this.prisma.npsResponse.create({
      data: {
        restaurantId: order.restaurantId,
        customerId: order.customerId,
        orderId: order.id,
        score: body.score,
        comment: body.comment,
      },
    });
    if (order.id) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { npsRequested: true },
      });
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
        total: true,
        deliveryType: true,
        createdAt: true,
        tab: {
          select: {
            payments: {
              where: { status: 'CONFIRMED' },
              take: 1,
              select: { status: true },
            },
          },
        },
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
