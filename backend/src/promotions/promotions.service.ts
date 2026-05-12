import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PromoDiscountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateDto {
  nome: string;
  descricao?: string;
  productIds?: number[];
  categoryIds?: number[];
  tipoDesconto: PromoDiscountType;
  valorDesconto: number;
  validoDe?: string;
  validoAte?: string;
  diasSemana?: number[];
  horaInicio?: string;
  horaFim?: string;
}

interface UpdateDto {
  nome?: string;
  descricao?: string;
  productIds?: number[];
  categoryIds?: number[];
  tipoDesconto?: PromoDiscountType;
  valorDesconto?: number;
  validoDe?: string | null;
  validoAte?: string | null;
  diasSemana?: number[];
  horaInicio?: string | null;
  horaFim?: string | null;
  ativo?: boolean;
}

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.promotionalSchedule.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActive(restaurantId: number) {
    const now = new Date();
    return this.prisma.promotionalSchedule.findMany({
      where: {
        restaurantId,
        ativo: true,
        OR: [{ validoDe: null }, { validoDe: { lte: now } }],
        AND: [{ OR: [{ validoAte: null }, { validoAte: { gte: now } }] }],
      },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const promo = await this.prisma.promotionalSchedule.findFirst({
      where: { id, restaurantId },
    });
    if (!promo) throw new NotFoundException('Promoção não encontrada.');
    return promo;
  }

  async create(dto: CreateDto, restaurantId: number) {
    const exists = await this.prisma.promotionalSchedule.findFirst({
      where: { restaurantId, nome: dto.nome },
    });
    if (exists)
      throw new ConflictException('Já existe uma promoção com esse nome.');
    return this.prisma.promotionalSchedule.create({
      data: {
        ...dto,
        restaurantId,
        validoDe: dto.validoDe ? new Date(dto.validoDe) : undefined,
        validoAte: dto.validoAte ? new Date(dto.validoAte) : undefined,
      },
    });
  }

  async update(id: number, dto: UpdateDto, restaurantId: number) {
    await this.findOne(id, restaurantId);
    if (dto.nome) {
      const conflict = await this.prisma.promotionalSchedule.findFirst({
        where: { restaurantId, nome: dto.nome, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException('Já existe uma promoção com esse nome.');
    }
    const { validoDe, validoAte, ...rest } = dto;
    return this.prisma.promotionalSchedule.update({
      where: { id },
      data: {
        ...rest,
        ...(validoDe !== undefined
          ? { validoDe: validoDe ? new Date(validoDe) : null }
          : {}),
        ...(validoAte !== undefined
          ? { validoAte: validoAte ? new Date(validoAte) : null }
          : {}),
      },
    });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);
    await this.prisma.promotionalSchedule.update({
      where: { id },
      data: { ativo: false },
    });
    return { ok: true };
  }
}
