import 'dotenv/config';
import app from 'app.js';
import { prisma } from '#config/prisma';
import { logger } from '#shared/utils/logger';
import { env } from '#config/env';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL conectado com sucesso');
  } catch (err) {
    logger.error('Falha ao conectar no PostgreSQL', err);
    process.exit(1);
  }
}
const PORT = env.PORT;
const URL = env.APP_URL;
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${PORT} ${URL}`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} recebido, encerrando servidor...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Erros não tratados ────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Rejeição não tratada:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada:', err);
  process.exit(1);
});

bootstrap();
