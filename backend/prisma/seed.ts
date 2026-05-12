import 'dotenv/config';
import {
  DeliveryType,
  MembershipRole,
  OrderOrigin,
  OrderStatus,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // ─── Restaurante de demo ────────────────────────────────────────────────
  const hash = await bcrypt.hash('demo1234', 10);

  const demoAccount = await prisma.account.upsert({
    where: { email: 'demo@cardapiopedeai.com.br' },
    update: {},
    create: {
      nome: 'Pizzaria Bella',
      email: 'demo@cardapiopedeai.com.br',
      password: hash,
    },
  });

  const demoRestaurant = await prisma.restaurant.upsert({
    where: { slug: 'pizzaria-bella' },
    update: {},
    create: {
      slug: 'pizzaria-bella',
      nome: 'Pizzaria Bella',
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      corPrimaria: '#dc2626',
      taxaEntrega: 5.0,
      aberto: true,
    },
  });

  await prisma.membership.upsert({
    where: {
      accountId_restaurantId: {
        accountId: demoAccount.id,
        restaurantId: demoRestaurant.id,
      },
    },
    update: {},
    create: {
      accountId: demoAccount.id,
      restaurantId: demoRestaurant.id,
      role: MembershipRole.OWNER,
      ativo: true,
    },
  });

  // ─── Admin ───────────────────────────────────────────────────────────────
  await prisma.account.upsert({
    where: { email: 'admin@cardapiopedeai.com.br' },
    update: {},
    create: {
      nome: 'Admin',
      email: 'admin@cardapiopedeai.com.br',
      password: await bcrypt.hash('admin1234', 10),
      isPlatformAdmin: true,
    },
  });

  // ─── Categorias ─────────────────────────────────────────────────────────
  const catPizzas = await prisma.category.upsert({
    where: { id: 1 },
    update: {},
    create: { nome: 'Pizzas', restaurantId: demoRestaurant.id, displayOrder: 0 },
  });
  const catBebidas = await prisma.category.upsert({
    where: { id: 2 },
    update: {},
    create: { nome: 'Bebidas', restaurantId: demoRestaurant.id, displayOrder: 1 },
  });

  // ─── Produtos ────────────────────────────────────────────────────────────
  const p1 = await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Pizza Margherita',
      descricao: 'Molho de tomate, mussarela, manjericão',
      preco: 45.0,
      restaurantId: demoRestaurant.id,
      categoryId: catPizzas.id,
      disponivel: true,
    },
  });
  const p2 = await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nome: 'Pizza Calabresa',
      descricao: 'Molho de tomate, mussarela, calabresa, cebola',
      preco: 49.0,
      restaurantId: demoRestaurant.id,
      categoryId: catPizzas.id,
      disponivel: true,
    },
  });
  await prisma.product.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nome: 'Refrigerante Lata',
      descricao: 'Coca-Cola, Guaraná ou Fanta',
      preco: 6.0,
      restaurantId: demoRestaurant.id,
      categoryId: catBebidas.id,
      disponivel: true,
    },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function minutesAgo(n: number) {
    return new Date(Date.now() - n * 60_000);
  }
  function hoursAgo(n: number) {
    return new Date(Date.now() - n * 3_600_000);
  }
  function yesterday() {
    return new Date(Date.now() - 25 * 3_600_000);
  }

  async function makeOrder(opts: {
    number: number;
    customerName: string;
    customerPhone: string;
    productId: number;
    qty: number;
    deliveryType: DeliveryType;
    origin: OrderOrigin;
    status: OrderStatus;
    createdAt: Date;
    externalOrderId?: string;
    externalChannel?: string;
  }) {
    const product = await prisma.product.findUnique({
      where: { id: opts.productId },
    });
    if (!product) return;

    const deliveryFee =
      opts.deliveryType === DeliveryType.DELIVERY
        ? demoRestaurant.taxaEntrega
        : 0;
    const subtotal = product.preco * opts.qty;
    const total = subtotal + deliveryFee;

    const customer = await prisma.customer.upsert({
      where: {
        restaurantId_phone: {
          restaurantId: demoRestaurant.id,
          phone: opts.customerPhone,
        },
      },
      create: {
        restaurantId: demoRestaurant.id,
        name: opts.customerName,
        phone: opts.customerPhone,
        lastOrderAt: opts.createdAt,
      },
      update: { lastOrderAt: opts.createdAt },
    });

    const existing = await prisma.order.findUnique({
      where: {
        restaurantId_orderNumber: {
          restaurantId: demoRestaurant.id,
          orderNumber: opts.number,
        },
      },
    });
    if (existing) return;

    const timestamps: Record<string, Date> = {};
    const confirmedStatuses: OrderStatus[] = [
      OrderStatus.CONFIRMED,
      OrderStatus.IN_PREPARATION,
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
    ];
    if (confirmedStatuses.includes(opts.status))
      timestamps.confirmedAt = opts.createdAt;
    if (opts.status === OrderStatus.DELIVERED)
      timestamps.deliveredAt = opts.createdAt;

    await prisma.order.create({
      data: {
        restaurantId: demoRestaurant.id,
        customerId: customer.id,
        orderNumber: opts.number,
        customerName: opts.customerName,
        customerPhone: opts.customerPhone,
        deliveryType: opts.deliveryType,
        deliveryFee,
        subtotal,
        discountAmount: 0,
        total,
        orderStatus: opts.status,
        origin: opts.origin,
        externalOrderId: opts.externalOrderId,
        externalChannel: opts.externalChannel,
        createdAt: opts.createdAt,
        ...timestamps,
        items: {
          create: {
            productId: opts.productId,
            productNameSnapshot: product.nome,
            productPriceSnapshot: product.preco,
            quantity: opts.qty,
            unitPrice: product.preco,
            itemTotal: product.preco * opts.qty,
          },
        },
        history: {
          create: { toStatus: opts.status },
        },
      },
    });
  }

  // ─── Pedidos de seed ─────────────────────────────────────────────────────
  await makeOrder({
    number: 1,
    customerName: 'Carlos Mendes',
    customerPhone: '11999990001',
    productId: p1.id,
    qty: 1,
    deliveryType: DeliveryType.DELIVERY,
    origin: OrderOrigin.WEBSITE,
    status: OrderStatus.DELIVERED,
    createdAt: yesterday(),
  });

  await makeOrder({
    number: 2,
    customerName: 'Ana Souza',
    customerPhone: '11999990002',
    productId: p2.id,
    qty: 2,
    deliveryType: DeliveryType.PICKUP,
    origin: OrderOrigin.WEBSITE,
    status: OrderStatus.IN_PREPARATION,
    createdAt: minutesAgo(30),
  });

  await makeOrder({
    number: 3,
    customerName: 'Roberto Lima',
    customerPhone: '11999990003',
    productId: p1.id,
    qty: 1,
    deliveryType: DeliveryType.PICKUP,
    origin: OrderOrigin.MANUAL,
    status: OrderStatus.CONFIRMED,
    createdAt: minutesAgo(5),
  });

  await makeOrder({
    number: 4,
    customerName: 'Fernanda Costa',
    customerPhone: '11999990004',
    productId: p2.id,
    qty: 1,
    deliveryType: DeliveryType.DELIVERY,
    origin: OrderOrigin.WHATSAPP_BOT,
    status: OrderStatus.PENDING,
    externalOrderId: 'wa-bot-mock-001',
    createdAt: minutesAgo(2),
  });

  await makeOrder({
    number: 5,
    customerName: 'Paulo Rodrigues',
    customerPhone: '11999990005',
    productId: p1.id,
    qty: 1,
    deliveryType: DeliveryType.DELIVERY,
    origin: OrderOrigin.IFOOD,
    status: OrderStatus.DELIVERED,
    externalOrderId: 'ifood-mock-XYZ123',
    externalChannel: 'ifood-merchant-demo',
    createdAt: hoursAgo(3),
  });

  console.log('✅ Seed concluído:', {
    restaurant: demoAccount.email,
    slug: demoRestaurant.slug,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
