import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const BRAND = 'cardapio.pede.ai';
const CTA_COLOR = '#E63946';

function baseTemplate(
  title: string,
  body: string,
  ctaText?: string,
  ctaUrl?: string,
) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:${CTA_COLOR};padding:24px 32px">
        <span style="color:#fff;font-size:20px;font-weight:bold">${BRAND}</span>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 16px;color:#111827;font-size:20px">${title}</h2>
        ${body}
        ${ctaText && ctaUrl ? `<div style="margin-top:24px"><a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;background:${CTA_COLOR};color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">${ctaText}</a></div>` : ''}
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af">
        © ${new Date().getFullYear()} ${BRAND} · <a href="https://cardapiopedeai.com.br/privacidade" style="color:#9ca3af">Descadastrar</a>
      </div>
    </div>
  `;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.transporter) {
      console.log(`[MAIL DEV] Para: ${to} | Assunto: ${subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || `noreply@cardapiopedeai.com.br`,
      to,
      subject,
      html,
    });
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const html = baseTemplate(
      'Recuperação de senha',
      '<p style="color:#4b5563">Você solicitou a redefinição da sua senha. Clique no botão abaixo para continuar.</p><p style="color:#9ca3af;font-size:13px">Este link expira em 1 hora.</p>',
      'Redefinir senha',
      resetUrl,
    );
    await this.send(to, 'Recuperação de senha — ' + BRAND, html);
  }

  async sendWelcome(to: string, nome: string, slug: string) {
    const url = `https://cardapiopedeai.com.br/cardapio/${slug}`;
    const html = baseTemplate(
      `Bem-vindo, ${nome}! 🎉`,
      `<p style="color:#4b5563">Seu cardápio digital está pronto. Compartilhe o link abaixo com seus clientes:</p><p style="background:#f3f4f6;padding:12px;border-radius:8px;font-family:monospace;font-size:14px">${url}</p>`,
      'Acessar meu painel',
      'https://cardapiopedeai.com.br/dashboard',
    );
    await this.send(to, `Bem-vindo ao ${BRAND}!`, html);
  }

  async sendTrialEnding(to: string, nome: string, daysLeft: number) {
    const html = baseTemplate(
      `Seu trial expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`,
      `<p style="color:#4b5563">Olá ${nome}! Seu período de trial termina em breve. Assine agora para continuar recebendo pedidos sem interrupção.</p>`,
      'Assinar agora',
      'https://cardapiopedeai.com.br/dashboard/assinatura',
    );
    await this.send(
      to,
      `Atenção: trial expira em ${daysLeft} dias — ${BRAND}`,
      html,
    );
  }

  async sendSubscriptionConfirmed(
    to: string,
    nome: string,
    plan: string,
    nextBilling: string,
  ) {
    const html = baseTemplate(
      'Assinatura confirmada ✅',
      `<p style="color:#4b5563">Olá ${nome}! Sua assinatura do plano <strong>${plan}</strong> foi confirmada. Próxima cobrança: <strong>${nextBilling}</strong>.</p>`,
      'Acessar painel',
      'https://cardapiopedeai.com.br/dashboard',
    );
    await this.send(to, `Assinatura confirmada — ${BRAND}`, html);
  }

  async sendSubscriptionCanceled(to: string, nome: string) {
    const html = baseTemplate(
      'Assinatura cancelada',
      `<p style="color:#4b5563">Olá ${nome}, sua assinatura foi cancelada. Sentiremos sua falta! Se mudar de ideia, reative a qualquer momento.</p>`,
      'Reativar assinatura',
      'https://cardapiopedeai.com.br/dashboard/assinatura',
    );
    await this.send(to, `Assinatura cancelada — ${BRAND}`, html);
  }

  async sendPaymentFailed(to: string, nome: string) {
    const html = baseTemplate(
      'Falha no pagamento ⚠️',
      `<p style="color:#4b5563">Olá ${nome}, houve um problema ao processar seu pagamento. Atualize seu método de pagamento para evitar interrupções.</p>`,
      'Atualizar pagamento',
      'https://cardapiopedeai.com.br/dashboard/assinatura',
    );
    await this.send(to, `Falha no pagamento — ${BRAND}`, html);
  }

  async sendNpsRequest(
    to: string,
    nome: string,
    orderNumber: number,
    npsUrl: string,
  ) {
    const html = baseTemplate(
      `Como foi seu pedido #${orderNumber}?`,
      `<p style="color:#4b5563">Olá ${nome}! Seu pedido foi entregue. Sua opinião nos ajuda a melhorar. Leva menos de 1 minuto!</p>`,
      'Avaliar pedido',
      npsUrl,
    );
    await this.send(to, `Avalie seu pedido #${orderNumber} — ${BRAND}`, html);
  }

  async sendCartAbandonment(to: string, nome: string, cartUrl: string) {
    const html = baseTemplate(
      'Você esqueceu algo no carrinho 🛒',
      `<p style="color:#4b5563">Olá ${nome}! Você montou um pedido mas não finalizou. Que tal concluir agora?</p>`,
      'Finalizar pedido',
      cartUrl,
    );
    await this.send(to, `Finalize seu pedido — ${BRAND}`, html);
  }
}
