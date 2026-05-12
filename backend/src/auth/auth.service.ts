import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(data: { email: string; password: string }) {
    const account = await this.prisma.account.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          where: { ativo: true },
          include: {
            restaurant: {
              select: {
                id: true,
                publicId: true,
                slug: true,
                nome: true,
                plan: true,
                subscriptionStatus: true,
              },
            },
          },
        },
      },
    });

    if (!account || !(await bcrypt.compare(data.password, account.password))) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (!account.isActive) {
      throw new UnauthorizedException('Conta inativa.');
    }

    const memberships = account.memberships;
    if (memberships.length === 0) {
      throw new UnauthorizedException('Conta sem acesso a nenhum restaurante');
    }

    // TODO: auto-select only when memberships.length === 1; otherwise require explicit selectRestaurant() call
    const firstMembership = memberships[0];
    if (firstMembership.restaurant.subscriptionStatus === 'CANCELED') {
      throw new UnauthorizedException('Assinatura indisponivel.');
    }

    const activeRestaurantId = firstMembership.restaurantId;
    const token = await this.jwtService.signAsync({
      sub: account.id,
      accountId: account.id,
      activeRestaurantId,
      role: firstMembership.role,
      isPlatformAdmin: account.isPlatformAdmin,
    });

    return {
      access_token: token,
      memberships,
      activeRestaurantId,
      user: {
        id: account.id,
        nome: account.nome,
        email: account.email,
        whatsapp: account.whatsapp,
        slug: firstMembership.restaurant.slug,
        role: firstMembership.role,
        isActive: account.isActive,
        plan: firstMembership.restaurant.plan,
        subscriptionStatus: firstMembership.restaurant.subscriptionStatus,
      },
    };
  }

  async selectRestaurant(accountId: number, restaurantPublicId: string) {
    const accountMeta = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { isPlatformAdmin: true },
    });

    const membership = await this.prisma.membership.findFirst({
      where: {
        accountId,
        ativo: true,
        restaurant: { publicId: restaurantPublicId },
      },
      include: {
        restaurant: {
          select: { id: true, publicId: true, slug: true, nome: true },
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Sem acesso a este restaurante');
    }

    await this.prisma.membership.update({
      where: { id: membership.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.jwtService.signAsync({
      sub: accountId,
      accountId,
      activeRestaurantId: membership.restaurantId,
      role: membership.role,
      isPlatformAdmin: accountMeta?.isPlatformAdmin ?? false,
    });

    return {
      access_token: token,
      activeRestaurantId: membership.restaurantId,
    };
  }

  async getMemberships(accountId: number) {
    return this.prisma.membership.findMany({
      where: { accountId, ativo: true },
      include: {
        restaurant: {
          select: { id: true, publicId: true, slug: true, nome: true },
        },
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message:
          'Se este e-mail estiver cadastrado, você receberá as instruções.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await this.usersService.setResetToken(user.id, token, expiry);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailService.sendPasswordReset(user.email, resetUrl);

    return {
      message:
        'Se este e-mail estiver cadastrado, você receberá as instruções.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);

    return { message: 'Senha atualizada com sucesso.' };
  }
}
