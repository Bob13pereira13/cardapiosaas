import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MembershipRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  findAll(restaurantId: number) {
    return this.prisma.membership.findMany({
      where: { restaurantId, ativo: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
        account: {
          select: { id: true, nome: true, email: true, whatsapp: true },
        },
      },
    });
  }

  async create(
    restaurantId: number,
    dto: {
      nome: string;
      email: string;
      senha?: string;
      password?: string;
      role?: MembershipRole;
    },
  ) {
    const existingAccount = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });

    const targetRole = dto.role ?? MembershipRole.ATTENDANT;

    if (existingAccount) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: {
          accountId_restaurantId: {
            accountId: existingAccount.id,
            restaurantId,
          },
        },
      });

      if (existingMembership) {
        if (existingMembership.ativo) {
          throw new BadRequestException('Membro já existe neste restaurante.');
        }
        return this.prisma.membership.update({
          where: { id: existingMembership.id },
          data: { ativo: true, role: targetRole },
          select: {
            id: true,
            role: true,
            ativo: true,
            lastLoginAt: true,
            createdAt: true,
            account: {
              select: { id: true, nome: true, email: true, whatsapp: true },
            },
          },
        });
      }

      return this.prisma.membership.create({
        data: { accountId: existingAccount.id, restaurantId, role: targetRole },
        select: {
          id: true,
          role: true,
          ativo: true,
          lastLoginAt: true,
          createdAt: true,
          account: {
            select: { id: true, nome: true, email: true, whatsapp: true },
          },
        },
      });
    }

    const rawPassword = dto.senha ?? dto.password;
    if (!rawPassword) {
      throw new BadRequestException(
        'Senha temporária obrigatória para nova conta.',
      );
    }
    const hash = await bcrypt.hash(rawPassword, 10);
    const account = await this.prisma.account.create({
      data: { email: dto.email, nome: dto.nome, password: hash },
    });

    return this.prisma.membership.create({
      data: { accountId: account.id, restaurantId, role: targetRole },
      select: {
        id: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        createdAt: true,
        account: {
          select: { id: true, nome: true, email: true, whatsapp: true },
        },
      },
    });
  }

  async update(
    restaurantId: number,
    membershipId: number,
    dto: { role?: MembershipRole },
  ) {
    await this.ensureOwner(restaurantId, membershipId);
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
      select: {
        id: true,
        role: true,
        ativo: true,
        lastLoginAt: true,
        updatedAt: true,
        account: {
          select: { id: true, nome: true, email: true },
        },
      },
    });
  }

  async remove(restaurantId: number, membershipId: number) {
    const membership = await this.ensureOwner(restaurantId, membershipId);
    if (membership.role === MembershipRole.OWNER) {
      throw new BadRequestException('Não é possível remover o proprietário.');
    }
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { ativo: false },
    });
    return { ok: true };
  }

  private async ensureOwner(restaurantId: number, membershipId: number) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, restaurantId },
    });
    if (!membership) throw new NotFoundException('Membro não encontrado.');
    return membership;
  }
}
