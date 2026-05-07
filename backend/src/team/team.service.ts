import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TeamMemberRole } from '@prisma/client';

interface CreateTeamMemberDto {
  nome: string;
  email: string;
  senha?: string;
  password?: string;
  cargo?: TeamMemberRole;
}

interface UpdateTeamMemberDto {
  nome?: string;
  email?: string;
  password?: string;
  cargo?: TeamMemberRole;
  ativo?: boolean;
}

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.restaurantTeamMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, lastLoginAt: true, createdAt: true },
    });
  }

  async create(userId: number, dto: CreateTeamMemberDto) {
    const exists = await this.prisma.restaurantTeamMember.findFirst({ where: { userId, email: dto.email } });
    if (exists) throw new BadRequestException('Já existe um membro com esse e-mail.');
    const rawPassword = dto.senha ?? dto.password;
    if (!rawPassword) throw new BadRequestException('Senha temporaria obrigatoria.');
    const hash = await bcrypt.hash(rawPassword, 10);
    return this.prisma.restaurantTeamMember.create({
      data: { userId, nome: dto.nome, email: dto.email, password: hash, cargo: dto.cargo ?? 'ATTENDANT' },
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, lastLoginAt: true, createdAt: true },
    });
  }

  async update(userId: number, id: number, dto: UpdateTeamMemberDto) {
    await this.ensureOwner(userId, id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.restaurantTeamMember.update({
      where: { id },
      data,
      select: { id: true, nome: true, email: true, cargo: true, ativo: true, lastLoginAt: true, createdAt: true },
    });
  }

  async remove(userId: number, id: number) {
    await this.ensureOwner(userId, id);
    await this.prisma.restaurantTeamMember.delete({ where: { id } });
    return { ok: true };
  }

  async getLastLogin(userId: number, id: number) {
    const member = await this.ensureOwner(userId, id);
    return { lastLoginAt: member.lastLoginAt };
  }

  private async ensureOwner(userId: number, id: number) {
    const member = await this.prisma.restaurantTeamMember.findFirst({ where: { id, userId } });
    if (!member) throw new NotFoundException('Membro não encontrado.');
    return member;
  }
}
