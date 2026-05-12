/**
 * BACKFILL TENANCY — Fase B da Etapa 0
 * Idempotente. Pode rodar múltiplas vezes sem duplicar.
 */
import 'dotenv/config';
import { PrismaClient, MembershipRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

const ROLE_MAP: Record<string, MembershipRole> = {
  OWNER: MembershipRole.OWNER,
  MANAGER: MembershipRole.MANAGER,
  ATTENDANT: MembershipRole.ATTENDANT,
  KITCHEN: MembershipRole.KITCHEN,
  CASHIER: MembershipRole.CASHIER,
};

function slugify(input: string): string {
  return input.toString().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'loja';
}

async function ensureUniqueSlug(base: string, excludeRestaurantId?: number): Promise<string> {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.restaurant.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeRestaurantId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function migrateUser(legacyUser: any) {
  let account = await prisma.account.findUnique({ where: { email: legacyUser.email } });
  if (!account) {
    account = await prisma.account.create({
      data: {
        email: legacyUser.email,
        password: legacyUser.password,
        nome: legacyUser.nome,
        whatsapp: legacyUser.whatsapp ?? null,
        isActive: legacyUser.isActive ?? true,
        isPlatformAdmin: legacyUser.role === 'ADMIN',
        asaasCustomerId: legacyUser.asaasCustomerId ?? null,
        resetToken: legacyUser.resetToken ?? null,
        resetTokenExpiry: legacyUser.resetTokenExpiry ?? null,
      },
    });
  }

  let restaurant = await prisma.restaurant.findUnique({ where: { id: legacyUser.id } });
  if (!restaurant) {
    const baseSlug = legacyUser.slug ? legacyUser.slug : slugify(legacyUser.nome);
    const finalSlug = await ensureUniqueSlug(baseSlug, legacyUser.id);

    restaurant = await prisma.restaurant.create({
      data: {
        id: legacyUser.id,
        slug: finalSlug,
        nome: legacyUser.nome,
        logo: legacyUser.logo, banner: legacyUser.banner,
        corPrimaria: legacyUser.corPrimaria,
        textoBoasVindas: legacyUser.textoBoasVindas,
        textoRodape: legacyUser.textoRodape,
        mostrarPrecos: legacyUser.mostrarPrecos ?? true,
        aberto: legacyUser.aberto ?? true,
        pausaAtiva: legacyUser.pausaAtiva ?? false,
        pausaAbertura: legacyUser.pausaAbertura,
        pausaFechamento: legacyUser.pausaFechamento,
        mensagemFechado: legacyUser.mensagemFechado,
        horarioAbertura: legacyUser.horarioAbertura,
        horarioFechamento: legacyUser.horarioFechamento,
        businessHours: legacyUser.businessHours ?? null,
        aceitaEntrega: legacyUser.aceitaEntrega ?? true,
        aceitaRetirada: legacyUser.aceitaRetirada ?? true,
        aceitaMesa: legacyUser.aceitaMesa ?? false,
        taxaEntrega: legacyUser.taxaEntrega ?? 0,
        tempoEstimadoEntrega: legacyUser.tempoEstimadoEntrega,
        pedidoMinimoEntregaGratis: legacyUser.pedidoMinimoEntregaGratis,
        raioEntregaKm: legacyUser.raioEntregaKm,
        bairrosAtendidos: legacyUser.bairrosAtendidos ?? null,
        mensagemEntrega: legacyUser.mensagemEntrega,
        aceitaDinheiro: legacyUser.aceitaDinheiro ?? true,
        aceitaPixPresencial: legacyUser.aceitaPixPresencial ?? true,
        aceitaCartaoCredito: legacyUser.aceitaCartaoCredito ?? true,
        aceitaCartaoDebito: legacyUser.aceitaCartaoDebito ?? true,
        chavePix: legacyUser.chavePix,
        whatsapp: legacyUser.whatsapp,
        wppMsgPedido: legacyUser.wppMsgPedido,
        wppMsgConfirmado: legacyUser.wppMsgConfirmado,
        wppMsgPronto: legacyUser.wppMsgPronto,
        wppMsgSaiu: legacyUser.wppMsgSaiu,
        wppEnvioAutomatico: legacyUser.wppEnvioAutomatico ?? false,
        nomePlataforma: legacyUser.nomePlataforma,
        emailSuporte: legacyUser.emailSuporte,
        whatsappSuporte: legacyUser.whatsappSuporte,
        urlPublica: legacyUser.urlPublica,
        plan: legacyUser.plan ?? 'FREE',
        subscriptionStatus: legacyUser.subscriptionStatus ?? 'TRIAL',
        trialEndsAt: legacyUser.trialEndsAt,
        asaasSubscriptionId: legacyUser.asaasSubscriptionId,
        gtmId: legacyUser.gtmId,
        ga4MeasurementId: legacyUser.ga4MeasurementId,
        metaPixelId: legacyUser.metaPixelId,
        metaAccessToken: legacyUser.metaAccessToken,
        customDomain: legacyUser.customDomain,
        customDomainVerified: legacyUser.customDomainVerified ?? false,
        customDomainStatus: legacyUser.customDomainStatus ?? 'PENDING',
        loyaltyEnabled: legacyUser.loyaltyEnabled ?? false,
        loyaltyPointsPerBrl: legacyUser.loyaltyPointsPerBrl ?? 1,
        loyaltyRedeemRate: legacyUser.loyaltyRedeemRate ?? 100,
        npsEnabled: legacyUser.npsEnabled ?? true,
        npsDaysAfterOrder: legacyUser.npsDaysAfterOrder ?? 1,
        notifEmailNewOrder: legacyUser.notifEmailNewOrder ?? false,
      },
    });
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"Restaurant"', 'id'), (SELECT MAX(id) FROM "Restaurant"));`,
    );
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { accountId_restaurantId: { accountId: account.id, restaurantId: restaurant.id } },
  });
  if (!existingMembership) {
    await prisma.membership.create({
      data: { accountId: account.id, restaurantId: restaurant.id, role: MembershipRole.OWNER, ativo: true },
    });
  }
  return { accountId: account.id, restaurantId: restaurant.id };
}

async function migrateTeamMember(legacyMember: any) {
  let account = await prisma.account.findUnique({ where: { email: legacyMember.email } });
  if (!account) {
    account = await prisma.account.create({
      data: {
        email: legacyMember.email,
        password: legacyMember.password,
        nome: legacyMember.nome,
        isActive: legacyMember.ativo ?? true,
        isPlatformAdmin: false,
      },
    });
  }
  const restaurantId = legacyMember.userId;
  const existing = await prisma.membership.findUnique({
    where: { accountId_restaurantId: { accountId: account.id, restaurantId } },
  });
  if (!existing) {
    const role = ROLE_MAP[legacyMember.cargo] ?? MembershipRole.ATTENDANT;
    await prisma.membership.create({
      data: { accountId: account.id, restaurantId, role, ativo: legacyMember.ativo ?? true, lastLoginAt: legacyMember.lastLoginAt ?? null },
    });
  }
}

async function main() {
  console.log('▶ Iniciando backfill de tenancy...\n');
  const legacyUsers = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "User" ORDER BY id ASC;`);
  console.log(`Encontrados ${legacyUsers.length} usuários.`);
  for (const u of legacyUsers) {
    try { await migrateUser(u); }
    catch (err) { console.error(`✗ Falha no User #${u.id} (${u.email}):`, err); throw err; }
  }
  console.log(`✓ ${legacyUsers.length} users processados\n`);

  const legacyMembers = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "RestaurantTeamMember" ORDER BY id ASC;`);
  console.log(`Encontrados ${legacyMembers.length} team members.`);
  for (const m of legacyMembers) {
    try { await migrateTeamMember(m); }
    catch (err) { console.error(`✗ Falha no TeamMember #${m.id} (${m.email}):`, err); throw err; }
  }
  console.log(`✓ ${legacyMembers.length} team members processados\n`);

  const totals = await prisma.$queryRawUnsafe<any[]>(`
    SELECT
      (SELECT COUNT(*)::int FROM "User") AS users,
      (SELECT COUNT(*)::int FROM "Account") AS accounts,
      (SELECT COUNT(*)::int FROM "Restaurant") AS restaurants,
      (SELECT COUNT(*)::int FROM "Membership") AS memberships,
      (SELECT COUNT(*)::int FROM "Membership" WHERE role = 'OWNER') AS memberships_owner
  `);
  console.log('▶ Validação:'); console.log(totals[0]);
  const t = totals[0];
  if (t.users === t.restaurants && t.users === t.memberships_owner) {
    console.log('✓ OK — backfill consistente.');
  } else {
    console.warn('⚠ Inconsistência. Revise antes da Fase C.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
