import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

type RequestWithUser = {
  user?: {
    isPlatformAdmin?: boolean;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user?.isPlatformAdmin) {
      throw new ForbiddenException('Acesso restrito ao administrador.');
    }

    return true;
  }
}
