import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    if (!this.transporter) {
      // Em desenvolvimento, exibe o link no console quando SMTP não está configurado
      console.log(`[MAIL DEV] Reset de senha para ${to}: ${resetUrl}`);
      return;
    }

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@cardapiosaas.com',
      to,
      subject: 'Recuperação de senha — Cardápio SaaS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Recuperação de senha</h2>
          <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para continuar:</p>
          <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:14px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
            Redefinir senha
          </a>
          <p style="color:#6b7280;font-size:13px;">Este link expira em 1 hora. Se você não solicitou a recuperação, ignore este e-mail.</p>
        </div>
      `,
    });
  }
}
