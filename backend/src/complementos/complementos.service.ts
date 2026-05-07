import { Injectable, NotFoundException } from '@nestjs/common';
import { OptionPriceMode, OptionGroupTipo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ComplementoDto = {
  nome?: string;
  descricao?: string | null;
  obrigatorio?: boolean;
  multiplaEscolha?: boolean;
  minSelecoes?: number;
  maxSelecoes?: number;
  ativo?: boolean;
  ordem?: number;
};

type OpcaoDto = {
  complementoId?: number;
  nome?: string;
  descricao?: string | null;
  preco?: number;
  imagem?: string | null;
  ativo?: boolean;
  estoque?: number | null;
  ordem?: number;
};

@Injectable()
export class ComplementosService {
  constructor(private prisma: PrismaService) {}

  private toComplemento(group: any) {
    return {
      id: group.id,
      nome: group.nome,
      descricao: group.descricao,
      obrigatorio: group.required,
      multiplaEscolha: group.maxSelections > 1,
      minSelecoes: group.minSelections,
      maxSelecoes: group.maxSelections,
      ativo: group.ativo,
      ordem: group.displayOrder,
      opcoes: group.options?.map((option: any) => this.toOpcao(option)),
      produtos: group.productLinks?.map((link: any) => link.product),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private toOpcao(option: any) {
    return {
      id: option.id,
      complementoId: option.optionGroupId,
      nome: option.nome,
      descricao: option.descricao,
      preco: option.priceModifier,
      imagem: option.imagem,
      ativo: option.available,
      estoque: option.estoque,
      ordem: option.displayOrder,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    };
  }

  findComplementos(userId: number) {
    return this.prisma.optionGroup
      .findMany({
        where: { userId },
        orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
          productLinks: { include: { product: { select: { id: true, nome: true } } } },
        },
      })
      .then((groups) => groups.map((group) => this.toComplemento(group)));
  }

  async createComplemento(userId: number, dto: Required<Pick<ComplementoDto, 'nome'>> & ComplementoDto) {
    const maxSelections = dto.maxSelecoes ?? (dto.multiplaEscolha ? 99 : 1);
    const group = await this.prisma.optionGroup.create({
      data: {
        userId,
        nome: dto.nome,
        descricao: dto.descricao,
        required: dto.obrigatorio ?? false,
        minSelections: dto.minSelecoes ?? 0,
        maxSelections,
        priceMode: OptionPriceMode.SUM,
        tipo: OptionGroupTipo.COMPLEMENTO,
        ativo: dto.ativo ?? true,
        displayOrder: dto.ordem ?? 0,
      },
      include: { options: true, productLinks: { include: { product: { select: { id: true, nome: true } } } } },
    });
    return this.toComplemento(group);
  }

  async getComplemento(userId: number, id: number) {
    const group = await this.prisma.optionGroup.findFirst({
      where: { id, userId },
      include: {
        options: { orderBy: { displayOrder: 'asc' } },
        productLinks: { include: { product: { select: { id: true, nome: true } } } },
      },
    });
    if (!group) throw new NotFoundException('Complemento nao encontrado.');
    return this.toComplemento(group);
  }

  async updateComplemento(userId: number, id: number, dto: ComplementoDto) {
    await this.getComplemento(userId, id);
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.obrigatorio !== undefined) data.required = dto.obrigatorio;
    if (dto.minSelecoes !== undefined) data.minSelections = dto.minSelecoes;
    if (dto.maxSelecoes !== undefined) data.maxSelections = dto.maxSelecoes;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.ordem !== undefined) data.displayOrder = dto.ordem;
    if (dto.multiplaEscolha === false && dto.maxSelecoes === undefined) data.maxSelections = 1;
    const group = await this.prisma.optionGroup.update({
      where: { id },
      data,
      include: { options: true, productLinks: { include: { product: { select: { id: true, nome: true } } } } },
    });
    return this.toComplemento(group);
  }

  async deleteComplemento(userId: number, id: number) {
    await this.getComplemento(userId, id);
    await this.prisma.optionGroup.delete({ where: { id } });
    return { ok: true };
  }

  toggleComplemento(userId: number, id: number) {
    return this.getComplemento(userId, id).then((group) =>
      this.updateComplemento(userId, id, { ativo: !group.ativo }),
    );
  }

  findOpcoes(userId: number) {
    return this.prisma.option
      .findMany({
        where: { optionGroup: { userId } },
        orderBy: [{ displayOrder: 'asc' }, { id: 'desc' }],
        include: { optionGroup: { select: { id: true, nome: true } } },
      })
      .then((options) => options.map((option) => ({ ...this.toOpcao(option), complemento: option.optionGroup })));
  }

  async createOpcao(userId: number, dto: Required<Pick<OpcaoDto, 'complementoId' | 'nome'>> & OpcaoDto) {
    await this.getComplemento(userId, dto.complementoId);
    const option = await this.prisma.option.create({
      data: {
        optionGroupId: dto.complementoId,
        nome: dto.nome,
        descricao: dto.descricao,
        priceModifier: dto.preco ?? 0,
        imagem: dto.imagem,
        available: dto.ativo ?? true,
        estoque: dto.estoque,
        displayOrder: dto.ordem ?? 0,
      },
    });
    return this.toOpcao(option);
  }

  async getOpcao(userId: number, id: number) {
    const option = await this.prisma.option.findFirst({
      where: { id, optionGroup: { userId } },
    });
    if (!option) throw new NotFoundException('Opcao nao encontrada.');
    return this.toOpcao(option);
  }

  async updateOpcao(userId: number, id: number, dto: OpcaoDto) {
    await this.getOpcao(userId, id);
    const data: Record<string, unknown> = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.descricao !== undefined) data.descricao = dto.descricao;
    if (dto.preco !== undefined) data.priceModifier = dto.preco;
    if (dto.imagem !== undefined) data.imagem = dto.imagem;
    if (dto.ativo !== undefined) data.available = dto.ativo;
    if (dto.estoque !== undefined) data.estoque = dto.estoque;
    if (dto.ordem !== undefined) data.displayOrder = dto.ordem;
    const option = await this.prisma.option.update({ where: { id }, data });
    return this.toOpcao(option);
  }

  async deleteOpcao(userId: number, id: number) {
    await this.getOpcao(userId, id);
    await this.prisma.option.delete({ where: { id } });
    return { ok: true };
  }

  toggleOpcao(userId: number, id: number) {
    return this.getOpcao(userId, id).then((option) =>
      this.updateOpcao(userId, id, { ativo: !option.ativo }),
    );
  }
}
