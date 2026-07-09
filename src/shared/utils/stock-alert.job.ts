import { stockService } from '#modules/admin/stock.service';
import { emailService } from '#shared/email/email.service';
import { prisma } from '#config/prisma';
import { logger } from '#shared/utils/logger';

const INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startStockAlertJob() {
  const run = async () => {
    try {
      const { data: lowStockItems } = await stockService.getLowStockAlerts();

      if (lowStockItems.length === 0) return;

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true },
      });

      await sendAlertsToAdmins(admins, lowStockItems);
      logger.info(
        `Alerta de estoque enviado: ${lowStockItems.length} variante(s) abaixo do mínimo`,
      );
    } catch (error) {
      logger.error('Erro no job de alerta de estoque:', error);
    }
  };

  run();
  setInterval(run, INTERVAL_MS);

  logger.info('Job de alerta de estoque iniciado (intervalo: 24h)');
}

async function sendAlertsToAdmins(
  admins: { email: string }[],
  items: {
    productName: string;
    variantName: string;
    sku: string;
    stock: number;
    stockMin: number;
  }[],
) {
  for (const admin of admins) {
    await emailService.sendLowStockAlert(admin.email, items);
  }
}
