import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
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
    payload: { accountId?: number; activeRestaurantId?: number; role?: string },
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: payload.accountId },
      select: { id: true, email: true, isActive: true },
    });
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Conta inativa.');
    }

    if (payload.activeRestaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: payload.activeRestaurantId },
        select: { subscriptionStatus: true },
      });
      const path = request.path ?? request.url ?? '';
      if (
        restaurant?.subscriptionStatus === 'CANCELED' &&
        path !== '/users/me' &&
        path !== '/restaurants/me'
      ) {
        throw new UnauthorizedException('Assinatura indisponivel.');
      }
    }

    return {
      sub: account.id,
      id: account.id,
      accountId: account.id,
      activeRestaurantId: payload.activeRestaurantId ?? null,
      role: payload.role ?? null,
      email: account.email,
    };
  }
}
