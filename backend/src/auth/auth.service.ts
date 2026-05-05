import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(data: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta inativa.');
    }

    if (
      user.role === UserRole.RESTAURANT &&
      user.subscriptionStatus === 'CANCELED'
    ) {
      throw new UnauthorizedException('Assinatura indisponivel.');
    }

    const passwordValid = await bcrypt.compare(data.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        whatsapp: user.whatsapp,
        slug: user.slug,
        role: user.role,
        isActive: user.isActive,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (!user) {
      return {
        message:
          'Se este e-mail estiver cadastrado, você receberá as instruções.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

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
