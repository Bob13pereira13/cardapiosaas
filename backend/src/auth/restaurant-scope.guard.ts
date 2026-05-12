import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class RestaurantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.activeRestaurantId) {
      throw new ForbiddenException('Selecione um restaurante primeiro');
    }
    return true;
  }
}
