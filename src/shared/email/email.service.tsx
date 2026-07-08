import { render } from '@react-email/render';
import { mailer } from '#config/mailer';
import { env } from '#config/env';
import { logger } from '#shared/utils/logger';
import { WelcomeEmail } from './templates/welcome';
import { OrderConfirmedEmail } from './templates/order-confirmed';
import { OrderShippedEmail } from './templates/order-shipped';
import { ResetPasswordEmail } from './templates/reset-password';
import { LowStockEmail } from './templates/low-stock';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private async send(options: SendMailOptions): Promise<void> {
    if (!env.EMAIL_ENABLED) return;

    try {
      await mailer.sendMail({ from: env.EMAIL_FROM, ...options });
      logger.info(`E-mail enviado para: ${options.to} | Assunto: ${options.subject}`);
    } catch (err) {
      logger.error(`Falha ao enviar e-mail para ${options.to}:`, err);
    }
  }

  async sendWelcome(to: string, name: string) {
    const html = await render(<WelcomeEmail name={name} />);
    await this.send({
      to,
      subject: `Bem-vindo(a) ao E-commerce, ${name}!`,
      html,
    });
  }

  async sendOrderConfirmed(
    to: string,
    data: Omit<React.ComponentProps<typeof OrderConfirmedEmail>, never>,
  ) {
    const shortId = data.orderId.slice(0, 8).toUpperCase();
    const html = await render(<OrderConfirmedEmail {...data} />);
    await this.send({
      to,
      subject: `Pedido #${shortId} confirmado`,
      html,
    });
  }

  async sendOrderShipped(
    to: string,
    data: Omit<React.ComponentProps<typeof OrderShippedEmail>, never>,
  ) {
    const shortId = data.orderId.slice(0, 8).toUpperCase();
    const html = await render(<OrderShippedEmail {...data} />);
    await this.send({
      to,
      subject: `Seu pedido #${shortId} foi enviado!`,
      html,
    });
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    const html = await render(<ResetPasswordEmail name={name} token={token} />);
    await this.send({
      to,
      subject: 'Redefinicao de senha',
      html,
    });
  }

  async sendLowStockAlert(
    to: string,
    items: React.ComponentProps<typeof LowStockEmail>['items'],
  ) {
    const html = await render(<LowStockEmail items={items} />);
    await this.send({
      to,
      subject: `Alerta: ${items.length} produto(s) com estoque baixo`,
      html,
    });
  }
}

export const emailService = new EmailService();
