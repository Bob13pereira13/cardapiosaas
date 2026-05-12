import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateDto {
  nome: string;
  cor?: string;
  ordem?: number;
}

interface UpdateDto {
  nome?: string;
  cor?: string;
  ordem?: number;
  ativo?: boolean;
}

@Injectable()
export class ProductionSectorsService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.productionSector.findMany({
      where: { restaurantId, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async findOne(id: number, restaurantId: number) {
    const sector = await this.prisma.productionSector.findFirst({
      where: { id, restaurantId },
    });
    if (!sector)
      throw new NotFoundException('Setor de produção não encontrado.');
    return sector;
  }

  async create(dto: CreateDto, restaurantId: number) {
    const exists = await this.prisma.productionSector.findFirst({
      where: { restaurantId, nome: dto.nome },
    });
    if (exists)
      throw new ConflictException('Já existe um setor com esse nome.');
    return this.prisma.productionSector.create({
      data: { ...dto, restaurantId },
    });
  }

  async update(id: number, dto: UpdateDto, restaurantId: number) {
    await this.findOne(id, restaurantId);
    if (dto.nome) {
      const conflict = await this.prisma.productionSector.findFirst({
        where: { restaurantId, nome: dto.nome, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException('Já existe um setor com esse nome.');
    }
    return this.prisma.productionSector.update({ where: { id }, data: dto });
  }

  async remove(id: number, restaurantId: number) {
    await this.findOne(id, restaurantId);
    await this.prisma.productionSector.update({
      where: { id },
      data: { ativo: false },
    });
    return { ok: true };
  }
}
