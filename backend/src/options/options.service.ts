import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionsService {
  constructor(private prisma: PrismaService) {}

  private async verifyProduct(productId: number, restaurantId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, restaurantId },
    });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  private async verifyGroup(
    productId: number,
    groupId: number,
    restaurantId: number,
  ) {
    await this.verifyProduct(productId, restaurantId);
    const group = await this.prisma.optionGroup.findFirst({
      where: {
        id: groupId,
        restaurantId,
        productLinks: { some: { productId } },
      },
    });
    if (!group) throw new NotFoundException('Grupo de opções não encontrado.');
    return group;
  }

  findAll(productId: number, restaurantId: number) {
    return this.prisma.optionGroup.findMany({
      where: {
        restaurantId,
        productLinks: { some: { productId } },
      },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createGroup(
    productId: number,
    restaurantId: number,
    dto: CreateOptionGroupDto,
  ) {
    await this.verifyProduct(productId, restaurantId);
    return this.prisma.optionGroup.create({
      data: {
        restaurantId,
        ...dto,
        productLinks: { create: { productId, ordem: dto.displayOrder ?? 0 } },
      },
      include: { options: true },
    });
  }

  async updateGroup(
    productId: number,
    groupId: number,
    restaurantId: number,
    dto: UpdateOptionGroupDto,
  ) {
    await this.verifyGroup(productId, groupId, restaurantId);
    return this.prisma.optionGroup.update({
      where: { id: groupId },
      data: dto,
      include: { options: true },
    });
  }

  async deleteGroup(productId: number, groupId: number, restaurantId: number) {
    await this.verifyGroup(productId, groupId, restaurantId);
    await this.prisma.optionGroup.delete({ where: { id: groupId } });
    return { ok: true };
  }

  async addOption(
    productId: number,
    groupId: number,
    restaurantId: number,
    dto: CreateOptionDto,
  ) {
    await this.verifyGroup(productId, groupId, restaurantId);
    return this.prisma.option.create({
      data: { optionGroupId: groupId, ...dto },
    });
  }

  async updateOption(
    productId: number,
    groupId: number,
    optionId: number,
    restaurantId: number,
    dto: UpdateOptionDto,
  ) {
    await this.verifyGroup(productId, groupId, restaurantId);
    const opt = await this.prisma.option.findFirst({
      where: { id: optionId, optionGroupId: groupId },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');
    return this.prisma.option.update({ where: { id: optionId }, data: dto });
  }

  async deleteOption(
    productId: number,
    groupId: number,
    optionId: number,
    restaurantId: number,
  ) {
    await this.verifyGroup(productId, groupId, restaurantId);
    const opt = await this.prisma.option.findFirst({
      where: { id: optionId, optionGroupId: groupId },
    });
    if (!opt) throw new NotFoundException('Opção não encontrada.');
    await this.prisma.option.delete({ where: { id: optionId } });
    return { ok: true };
  }
}
