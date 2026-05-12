import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { customer?: unknown }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify<{
        sub: number;
        restaurantId: number;
        role: string;
      }>(auth.slice(7));
      if (payload.role !== 'CUSTOMER') throw new UnauthorizedException();
      req.customer = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
