import { mpPaymentApi } from '#shared/payments/mercadopago.client';
import { prisma } from '#config/prisma';
import { NotFoundError } from '#shared/errors/appError';
import { sendOrderConfirmedEmail } from '#shared/email/send-order-email';

export class MercadoPagoService {
  async createCheckout(orderId: string, userId: string, method: 'PIX' | 'BOLETO') {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: 'PENDING',
      },
      include: { user: true },
    });
    if (!order) throw new NotFoundError('Pedido não encontrado ou já processado');

    const paymentMethod = method === 'PIX' ? 'pix' : 'bolbradesco';

    const result = await mpPaymentApi.create({
      body: {
        transaction_amount: Number(order.total),
        description: `Pedido #${order.id.slice(0, 8)}`,
        payment_method_id: paymentMethod,
        payer: {
          email: order.user.email,
          first_name: order.user.name.split(' ')[0],
        },
        metadata: { orderId: order.id },
      },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'MARCADOPAGO',
        method,
        status: 'PENDING',
        amount: Number(order.total),
        externalId: String(result.id),
        qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? null,
        barcodeUrl: result.transaction_details?.external_resource_url ?? null,
        expiresAt: result.date_of_expiration ? new Date(result.date_of_expiration) : null,
        updatedAt: new Date(),
      },
    });

    return {
      paymentId: result.id,
      status: result.status,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code ?? null,
      barcodeUrl: result.transaction_details?.external_resource_url ?? null,
      expiresAt: result.date_of_expiration ? new Date(result.date_of_expiration) : null,
    };
  }

  async handleWebhookNotification(paymentId: string) {
    const mpPayment = await mpPaymentApi.get({ id: paymentId });
    const payment = await prisma.payment.findUnique({
      where: { externalId: paymentId },
    });
    if (!payment) return { received: true };

    if (mpPayment.status === 'approved' && payment.status !== 'PAID') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', updatedAt: new Date(), rawPayload: mpPayment as any },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAYMENT_CONFIRMED' },
        }),
        prisma.orderStatusHistory.create({
          data: {
            orderId: payment.orderId,
            status: 'PAYMENT_CONFIRMED',
            note: 'Pagamento confirmado via MercadoPago',
          },
        }),
      ]);

      await sendOrderConfirmedEmail(payment.orderId);
    }

    if (['rejected', 'cancelled'].includes(mpPayment.status ?? '')) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', rawPayload: mpPayment as any },
      });
    }
    return { received: true };
  }
}

export const mercadopagoService = new MercadoPagoService();
