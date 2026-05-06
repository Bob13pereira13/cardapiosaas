import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, SubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateMeDto } from './dto/update-me.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  private hideTrackingToken<
    T extends {
      metaAccessToken?: string | null;
      metaAccessTokenConfigured?: boolean;
    },
  >(user: T) {
    const { metaAccessToken, ...safeUser } = user;
    return {
      ...safeUser,
      metaAccessTokenConfigured: Boolean(metaAccessToken),
    };
  }

  private gerarSlug(nome: string) {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
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

    const user = await this.prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        password: hashedPassword,
        slug,
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt,
      },
    });
    void this.mail.sendWelcome(user.email, user.nome, slug).catch(() => undefined);
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return this.expireTrialIfNeeded(user);
  }

  async updateWhatsapp(userId: number, whatsapp: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { whatsapp },
    });
  }

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        taxaEntrega: true,
        role: true,
        isActive: true,
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

    if (!user) return null;

    const userWithTrialStatus = await this.expireTrialIfNeeded(user);
    return this.hideTrackingToken(userWithTrialStatus);
  }

  async setResetToken(userId: number, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });
  }

  async updatePassword(userId: number, hashedPassword: string) {
    return this.prisma.user.update({
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

      const slugExistente = await this.prisma.user.findFirst({
        where: {
          slug: slugFormatado,
          NOT: { id: userId },
        },
      });

      if (slugExistente) {
        throw new BadRequestException('Este slug já está em uso.');
      }
    }

    if (data.newPassword) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });
      const valid = currentUser && data.currentPassword
        ? await bcrypt.compare(data.currentPassword, currentUser.password)
        : false;
      if (!valid) throw new BadRequestException('Senha atual invalida.');
      hashedPassword = await bcrypt.hash(data.newPassword, 10);
    }

    const customDomain = this.normalizeDomain(data.customDomain);
    let customDomainChanged = false;
    if (customDomain) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { customDomain: true },
      });
      customDomainChanged = currentUser?.customDomain !== customDomain;

      const domainOwner = await this.prisma.user.findFirst({
        where: {
          customDomain,
          NOT: { id: userId },
        },
      });

      if (domainOwner) {
        throw new BadRequestException('Este dominio ja esta em uso.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        nome: data.nome,
        email: data.email,
        password: hashedPassword,
        whatsapp: data.whatsapp,
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
        aceitaEntrega:             data.aceitaEntrega,
        aceitaRetirada:            data.aceitaRetirada,
        aceitaMesa:                data.aceitaMesa,
        tempoEstimadoEntrega:      data.tempoEstimadoEntrega,
        pedidoMinimoEntregaGratis: data.pedidoMinimoEntregaGratis,
        raioEntregaKm:             data.raioEntregaKm,
        aceitaDinheiro:            data.aceitaDinheiro,
        aceitaPixPresencial:       data.aceitaPixPresencial,
        aceitaCartaoCredito:       data.aceitaCartaoCredito,
        aceitaCartaoDebito:        data.aceitaCartaoDebito,
        chavePix:                  data.chavePix,
        businessHours:             data.businessHours ?? undefined,
        textoBoasVindas:           data.textoBoasVindas,
        textoRodape:               data.textoRodape,
        mostrarPrecos:             data.mostrarPrecos,
        mensagemFechado:           data.mensagemFechado,
        pausaAtiva:                data.pausaAtiva,
        pausaAbertura:             data.pausaAbertura,
        pausaFechamento:           data.pausaFechamento,
        bairrosAtendidos:          data.bairrosAtendidos === undefined ? undefined : data.bairrosAtendidos === null ? Prisma.JsonNull : data.bairrosAtendidos,
        mensagemEntrega:           data.mensagemEntrega,
        wppMsgPedido:              data.wppMsgPedido,
        wppMsgConfirmado:          data.wppMsgConfirmado,
        wppMsgPronto:              data.wppMsgPronto,
        wppMsgSaiu:                data.wppMsgSaiu,
        wppEnvioAutomatico:        data.wppEnvioAutomatico,
        nomePlataforma:            data.nomePlataforma,
        emailSuporte:              data.emailSuporte,
        whatsappSuporte:           data.whatsappSuporte,
        urlPublica:                data.urlPublica,
        notifEmailNewOrder:        data.notifEmailNewOrder,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        whatsapp: true,
        slug: true,
        logo: true,
        banner: true,
        aberto: true,
        horarioAbertura: true,
        horarioFechamento: true,
        corPrimaria: true,
        taxaEntrega: true,
        role: true,
        isActive: true,
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

    if (data.currentPassword && data.newPassword) {
      const userRow = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!userRow) throw new BadRequestException('Usuário não encontrado.');
      const valid = await bcrypt.compare(data.currentPassword, userRow.password);
      if (!valid) throw new BadRequestException('Senha atual incorreta.');
      const hashed = await bcrypt.hash(data.newPassword, 10);
      await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    }

    return this.hideTrackingToken(updatedUser);
  }

  private async expireTrialIfNeeded<
    T extends {
      id: number;
      role: UserRole;
      subscriptionStatus: SubscriptionStatus;
      trialEndsAt: Date | null;
    },
  >(user: T): Promise<T> {
    if (
      user.role !== UserRole.RESTAURANT ||
      user.subscriptionStatus !== SubscriptionStatus.TRIAL ||
      !user.trialEndsAt ||
      user.trialEndsAt.getTime() >= Date.now()
    ) {
      return user;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: SubscriptionStatus.OVERDUE },
    });

    return { ...user, subscriptionStatus: SubscriptionStatus.OVERDUE };
  }
}
