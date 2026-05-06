import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOptionGroupDto } from './dto/create-option-group.dto';
import { UpdateOptionGroupDto } from './dto/update-option-group.dto';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Injectable()
export class OptionsService {
  constructor(private prisma: PrismaService) {}

  private async verifyProduct(productId: number, userId: number) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, userId } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }

  private async verifyGroup(productId: number, groupId: number, userId: number) {
    await this.verifyProduct(productId, userId);
    const group = await this.prisma.optionGroup.findFirst({ where: { id: groupId, productId } });
    if (!group) throw new NotFoundException('Grupo de opções não encontrado.');
    return group;
  }

  findAll(productId: number, userId: number) {
    return this.prisma.optionGroup.findMany({
      where: { productId, product: { userId } },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createGroup(productId: number, userId: number, dto: CreateOptionGroupDto) {
    await this.verifyProduct(productId, userId);
    return this.prisma.optionGroup.create({
      data: { productId, ...dto },
      include: { options: true },
    });
  }

  async updateGroup(productId: number, groupId: number, userId: number, dto: UpdateOptionGroupDto) {
    await this.verifyGroup(productId, groupId, userId);
    return this.prisma.optionGroup.update({ where: { id: groupId }, data: dto, include: { options: true } });
  }

  async deleteGroup(productId: number, groupId: number, userId: number) {
    await this.verifyGroup(productId, groupId, userId);
    await this.prisma.optionGroup.delete({ where: { id: groupId } });
    return { ok: true };
  }

  async addOption(productId: number, groupId: number, userId: number, dto: CreateOptionDto) {
    await this.verifyGroup(productId, groupId, userId);
    return this.prisma.option.create({ data: { optionGroupId: groupId, ...dto } });
  }

  async updateOption(productId: number, groupId: number, optionId: number, userId: number, dto: UpdateOptionDto) {
    await this.verifyGroup(productId, groupId, userId);
    const opt = await this.prisma.option.findFirst({ where: { id: optionId, optionGroupId: groupId } });
    if (!opt) throw new NotFoundException('Opção não encontrada.');
    return this.prisma.option.update({ where: { id: optionId }, data: dto });
  }

  async deleteOption(productId: number, groupId: number, optionId: number, userId: number) {
    await this.verifyGroup(productId, groupId, userId);
    const opt = await this.prisma.option.findFirst({ where: { id: optionId, optionGroupId: groupId } });
    if (!opt) throw new NotFoundException('Opção não encontrada.');
    await this.prisma.option.delete({ where: { id: optionId } });
    return { ok: true };
  }
}
