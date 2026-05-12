import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

const RESTAURANT_SELECT = {
  id: true,
  publicId: true,
  slug: true,
  nome: true,
  logo: true,
  banner: true,
  corPrimaria: true,
  textoBoasVindas: true,
  textoRodape: true,
  mostrarPrecos: true,
  aberto: true,
  pausaAtiva: true,
  pausaAbertura: true,
  pausaFechamento: true,
  mensagemFechado: true,
  horarioAbertura: true,
  horarioFechamento: true,
  businessHours: true,
  aceitaEntrega: true,
  aceitaRetirada: true,
  aceitaMesa: true,
  taxaEntrega: true,
  tempoEstimadoEntrega: true,
  pedidoMinimoEntregaGratis: true,
  raioEntregaKm: true,
  bairrosAtendidos: true,
  mensagemEntrega: true,
  aceitaDinheiro: true,
  aceitaPixPresencial: true,
  aceitaCartaoCredito: true,
  aceitaCartaoDebito: true,
  chavePix: true,
  whatsapp: true,
  wppMsgPedido: true,
  wppMsgConfirmado: true,
  wppMsgPronto: true,
  wppMsgSaiu: true,
  wppEnvioAutomatico: true,
  nomePlataforma: true,
  emailSuporte: true,
  whatsappSuporte: true,
  urlPublica: true,
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
  loyaltyEnabled: true,
  loyaltyPointsPerBrl: true,
  loyaltyRedeemRate: true,
  npsEnabled: true,
  npsDaysAfterOrder: true,
  notifEmailNewOrder: true,
  lat: true,
  lng: true,
  cep: true,
} as const;

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  async findMe(restaurantId: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: RESTAURANT_SELECT,
    });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado.');

    const { metaAccessToken, ...safe } = restaurant;
    return { ...safe, metaAccessTokenConfigured: Boolean(metaAccessToken) };
  }

  async updateMe(restaurantId: number, data: UpdateRestaurantDto) {
    const normalizeDomain = (domain?: string) =>
      domain
        ?.trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/.*$/, '');

    const customDomain = normalizeDomain(data.customDomain);
    let customDomainChanged = false;
    if (customDomain !== undefined) {
      const current = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { customDomain: true },
      });
      customDomainChanged = current?.customDomain !== customDomain;
    }

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        nome: data.nome,
        whatsapp: data.whatsapp,
        slug: data.slug,
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
          data.metaAccessToken === '' ? null : data.metaAccessToken,
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
        businessHours:
          data.businessHours !== undefined
            ? (data.businessHours as Prisma.InputJsonValue)
            : undefined,
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
              : (data.bairrosAtendidos as Prisma.InputJsonValue),
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
        lat: data.lat,
        lng: data.lng,
        cep: data.cep,
      },
      select: RESTAURANT_SELECT,
    });

    const { metaAccessToken, ...safe } = updated;
    return { ...safe, metaAccessTokenConfigured: Boolean(metaAccessToken) };
  }
}
