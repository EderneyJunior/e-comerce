import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from '#shared/utils/logger';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function verifyMailerConnection() {
  if (!env.EMAIL_ENABLED) {
    logger.info(
      'Envio de e-mails está desativado. Ignorando verificação de conexão com o servidor de e-mail.',
    );
    return;
  }

  try {
    await mailer.verify();
    logger.info('Conexão com o servidor de e-mail verificada com sucesso.');
  } catch (error) {
    logger.error('Erro ao verificar a conexão com o servidor de e-mail:', error);
  }
}
