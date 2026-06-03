import { cartService } from '#modules/cart/cart.service';
import { logger } from './logger';

const INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startCleanupJob() {
  const run = async () => {
    try {
      const deleted = await cartService.cleanExpiredCarts();
      if (deleted > 0) {
        logger.info(`Job de limpeza de carrinhos: ${deleted} carrinho(s) anonimo(s) removido(s).`);
      }
    } catch (error) {
      logger.error('Erro no job de limpeza de carrinhos', error);
    }
  };

  run();
  setInterval(run, INTERVAL_MS);

  logger.info('Job de limpeza de carrinhos iniciado, rodando a cada 24 horas.');
}
