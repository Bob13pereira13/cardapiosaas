import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategyService extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET env var is required');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(
    request: { path?: string; url?: string },
    payload: { sub: number; email: string; role?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        subscriptionStatus: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Conta inativa.');
    }

    const subscriptionStatus = await this.expireTrialIfNeeded(user);
    const path = request.path ?? request.url ?? '';
    const canReadOwnStatus = path === '/users/me';

    if (
      user.role === UserRole.RESTAURANT &&
      subscriptionStatus === 'CANCELED' &&
      !canReadOwnStatus
    ) {
      throw new UnauthorizedException('Assinatura indisponivel.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async expireTrialIfNeeded(user: {
    id: number;
    role: UserRole;
    subscriptionStatus: string;
  }) {
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { trialEndsAt: true },
    });

    if (
      user.role !== UserRole.RESTAURANT ||
      user.subscriptionStatus !== 'TRIAL' ||
      !fullUser?.trialEndsAt ||
      fullUser.trialEndsAt.getTime() >= Date.now()
    ) {
      return user.subscriptionStatus;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'OVERDUE' },
    });

    return 'OVERDUE';
  }
}
