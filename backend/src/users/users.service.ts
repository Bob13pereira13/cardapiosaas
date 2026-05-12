import { Injectable, BadRequestException } from '@nestjs/common';
import { MembershipRole, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateMeDto } from './dto/update-me.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  private hideTrackingToken<
    T extends {
      metaAccessToken?: string | null;
      metaAccessTokenConfigured?: boolean;
    },
  >(obj: T) {
    const { metaAccessToken, ...safe } = obj;
    return {
      ...safe,
      metaAccessTokenConfigured: Boolean(metaAccessToken),
    };
  }

  private gerarSlug(nome: string) {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private normalizeDomain(domain?: string) {
    return domain
      ?.trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }

  async create(data: { nome: string; email: string; password: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const slug = this.gerarSlug(data.nome);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const { account, restaurant } = await this.prisma.$transaction(
      async (tx) => {
        const account = await tx.account.create({
          data: {
            nome: data.nome,
            email: data.email,
            password: hashedPassword,
          },
        });

        const restaurant = await tx.restaurant.create({
          data: {
            slug,
            nome: data.nome,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            trialEndsAt,
          },
        });

        await tx.membership.create({
          data: {
            accountId: account.id,
            restaurantId: restaurant.id,
            role: MembershipRole.OWNER,
            ativo: true,
          },
        });

        return { account, restaurant };
      },
    );

    void this.mail
      .sendWelcome(account.email, account.nome, restaurant.slug)
      .catch(() => undefined);
    return { ...account, slug: restaurant.slug };
  }

  async findByEmail(email: string) {
    return this.prisma.account.findUnique({ where: { email } });
  }

  async updateWhatsapp(restaurantId: number, whatsapp: string) {
    return this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: { whatsapp },
    });
  }

  async findById(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        taxaEntrega: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        gtmId: true,
        ga4MeasurementId: true,
        metaPixelId: true,
        metaAccessToken: true,
        customDomain: true,
        customDomainVerified: true,
        customDomainStatus: true,
        aceitaEntrega: true,
        aceitaRetirada: true,
        aceitaMesa: true,
        tempoEstimadoEntrega: true,
        pedidoMinimoEntregaGratis: true,
        raioEntregaKm: true,
        aceitaDinheiro: true,
        aceitaPixPresencial: true,
        aceitaCartaoCredito: true,
        aceitaCartaoDebito: true,
        chavePix: true,
        whatsapp: true,
        businessHours: true,
        textoBoasVindas: true,
        textoRodape: true,
        mostrarPrecos: true,
        mensagemFechado: true,
        pausaAtiva: true,
        pausaAbertura: true,
        pausaFechamento: true,
        bairrosAtendidos: true,
        mensagemEntrega: true,
        wppMsgPedido: true,
        wppMsgConfirmado: true,
        wppMsgPronto: true,
        wppMsgSaiu: true,
        wppEnvioAutomatico: true,
        nomePlataforma: true,
        emailSuporte: true,
        whatsappSuporte: true,
        urlPublica: true,
        notifEmailNewOrder: true,
      },
    });

    if (!restaurant) return null;

    const withTrialStatus = await this.expireTrialIfNeeded(restaurant);
    return this.hideTrackingToken(withTrialStatus);
  }

  async setResetToken(userId: number, token: string, expiry: Date) {
    return this.prisma.account.update({
      where: { id: userId },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
  }

  async findByResetToken(token: string) {
    return this.prisma.account.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });
  }

  async updatePassword(userId: number, hashedPassword: string) {
    return this.prisma.account.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }

  async updateMe(userId: number, data: UpdateMeDto) {
    let slugFormatado: string | undefined;
    let hashedPassword: string | undefined;

    if (data.slug !== undefined || data.nome !== undefined) {
      slugFormatado = this.gerarSlug(data.slug || data.nome || '');

      const slugExistente = await this.prisma.restaurant.findFirst({
        where: { slug: slugFormatado, NOT: { id: userId } },
      });

      if (slugExistente) {
        throw new BadRequestException('Este slug já está em uso.');
      }
    }

    if (data.newPassword) {
      const currentAccount = await this.prisma.account.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      const valid =
        currentAccount && data.currentPassword
          ? await bcrypt.compare(data.currentPassword, currentAccount.password)
          : false;
      if (!valid) throw new BadRequestException('Senha atual invalida.');
      hashedPassword = await bcrypt.hash(data.newPassword, 10);
    }

    const customDomain = this.normalizeDomain(data.customDomain);
    let customDomainChanged = false;
    if (customDomain) {
      const currentRestaurant = await this.prisma.restaurant.findUnique({
        where: { id: userId },
        select: { customDomain: true },
      });
      customDomainChanged = currentRestaurant?.customDomain !== customDomain;

      const domainOwner = await this.prisma.restaurant.findFirst({
        where: { customDomain, NOT: { id: userId } },
      });

      if (domainOwner) {
        throw new BadRequestException('Este dominio ja esta em uso.');
      }
    }

    if (data.email || hashedPassword) {
      await this.prisma.account.update({
        where: { id: userId },
        data: {
          ...(data.email ? { email: data.email } : {}),
          ...(hashedPassword ? { password: hashedPassword } : {}),
        },
      });
    }

    const updatedRestaurant = await this.prisma.restaurant.update({
      where: { id: userId },
      data: {
        nome: data.nome,
        slug: slugFormatado,
        logo: data.logo,
        banner: data.banner,
        aberto: data.aberto,
        horarioAbertura: data.horarioAbertura,
        horarioFechamento: data.horarioFechamento,
        corPrimaria: data.corPrimaria,
        taxaEntrega: data.taxaEntrega,
        gtmId: data.gtmId === '' ? null : data.gtmId,
        ga4MeasurementId:
          data.ga4MeasurementId === '' ? null : data.ga4MeasurementId,
        metaPixelId: data.metaPixelId === '' ? null : data.metaPixelId,
        metaAccessToken:
          data.metaAccessToken === ''
            ? null
            : data.metaAccessToken === undefined
              ? undefined
              : data.metaAccessToken,
        customDomain:
          data.customDomain === undefined ? undefined : customDomain || null,
        customDomainVerified:
          data.customDomain === undefined
            ? undefined
            : customDomainChanged || !customDomain
              ? false
              : undefined,
        customDomainStatus:
          data.customDomain === undefined
            ? undefined
            : customDomainChanged && customDomain
              ? 'PENDING'
              : !customDomain
                ? null
                : undefined,
        aceitaEntrega: data.aceitaEntrega,
        aceitaRetirada: data.aceitaRetirada,
        aceitaMesa: data.aceitaMesa,
        tempoEstimadoEntrega: data.tempoEstimadoEntrega,
        pedidoMinimoEntregaGratis: data.pedidoMinimoEntregaGratis,
        raioEntregaKm: data.raioEntregaKm,
        aceitaDinheiro: data.aceitaDinheiro,
        aceitaPixPresencial: data.aceitaPixPresencial,
        aceitaCartaoCredito: data.aceitaCartaoCredito,
        aceitaCartaoDebito: data.aceitaCartaoDebito,
        chavePix: data.chavePix,
        whatsapp: data.whatsapp,
        businessHours: data.businessHours ?? undefined,
        textoBoasVindas: data.textoBoasVindas,
        textoRodape: data.textoRodape,
        mostrarPrecos: data.mostrarPrecos,
        mensagemFechado: data.mensagemFechado,
        pausaAtiva: data.pausaAtiva,
        pausaAbertura: data.pausaAbertura,
        pausaFechamento: data.pausaFechamento,
        bairrosAtendidos:
          data.bairrosAtendidos === undefined
            ? undefined
            : data.bairrosAtendidos === null
              ? Prisma.JsonNull
              : data.bairrosAtendidos,
        mensagemEntrega: data.mensagemEntrega,
        wppMsgPedido: data.wppMsgPedido,
        wppMsgConfirmado: data.wppMsgConfirmado,
        wppMsgPronto: data.wppMsgPronto,
        wppMsgSaiu: data.wppMsgSaiu,
        wppEnvioAutomatico: data.wppEnvioAutomatico,
        nomePlataforma: data.nomePlataforma,
        emailSuporte: data.emailSuporte,
        whatsappSuporte: data.whatsappSuporte,
        urlPublica: data.urlPublica,
        notifEmailNewOrder: data.notifEmailNewOrder,
      },
      select: {
        id: true,
        nome: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        taxaEntrega: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        gtmId: true,
        ga4MeasurementId: true,
        metaPixelId: true,
        metaAccessToken: true,
        customDomain: true,
        customDomainVerified: true,
        customDomainStatus: true,
        aceitaEntrega: true,
        aceitaRetirada: true,
        aceitaMesa: true,
        tempoEstimadoEntrega: true,
        pedidoMinimoEntregaGratis: true,
        raioEntregaKm: true,
        aceitaDinheiro: true,
        aceitaCartaoCredito: true,
        aceitaCartaoDebito: true,
        chavePix: true,
        whatsapp: true,
        businessHours: true,
        textoBoasVindas: true,
        textoRodape: true,
        mostrarPrecos: true,
        mensagemFechado: true,
        pausaAtiva: true,
        pausaAbertura: true,
        pausaFechamento: true,
        bairrosAtendidos: true,
        mensagemEntrega: true,
        wppMsgPedido: true,
        wppMsgConfirmado: true,
        wppMsgPronto: true,
        wppMsgSaiu: true,
        wppEnvioAutomatico: true,
        nomePlataforma: true,
        emailSuporte: true,
        whatsappSuporte: true,
        urlPublica: true,
        notifEmailNewOrder: true,
        aceitaPixPresencial: true,
      },
    });

    return this.hideTrackingToken(updatedRestaurant);
  }

  private async expireTrialIfNeeded<
    T extends {
      id: number;
      subscriptionStatus: string;
      trialEndsAt: Date | null;
    },
  >(restaurant: T): Promise<T> {
    if (
      restaurant.subscriptionStatus !== SubscriptionStatus.TRIAL ||
      !restaurant.trialEndsAt ||
      restaurant.trialEndsAt.getTime() >= Date.now()
    ) {
      return restaurant;
    }

    await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { subscriptionStatus: SubscriptionStatus.OVERDUE },
    });

    return { ...restaurant, subscriptionStatus: SubscriptionStatus.OVERDUE };
  }
}
