import { orderService } from '#modules/orders/order.service';
import { logger } from './logger';
import { env } from '#config/env';

export function startOrderExpirationJob() {
  const INTERVAL_MS = 5 * 60 * 1000;

  const run = async () => {
    try {
      const count = await orderService.expireUnpairOrders(env.ORDER_PAYMENT_TIMEOUT_MINUTES);
      if (count > 0) {
        logger.info(`${count} pedidos(s) expirado(s) pro falta  de pagamento`);
      }
    } catch (err) {
      logger.error('Erro  no job  de expiração de pedidos', err);
    }
  };

  run();
  setInterval(run, INTERVAL_MS);

  logger.info('Job  de expiração de pedidos iniciado (intervalo: 5 min)');
}
