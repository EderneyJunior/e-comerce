import { stripeClient } from '#shared/payments/stripe.client';
import { prisma } from '#config/prisma';
import { env } from '#config/env';
import { NotFoundError, ForbiddenError, AppError } from '#shared/errors/appError';

export class StripeService {
  async createCheckout(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: userId, status: 'PENDING' },
    });
    if (!order) throw new NotFoundError('Pedido não encontrado ou já processado');

    const amountInCents = Math.round(Number(order.total) * 100);

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amountInCents,
      currency: env.STRIPE_CURRENCY,
      metadata: { orderId: order.id, userId },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'STRIPE',
        method: 'CREDIT_CARD',
        status: 'PENDING',
        amount: order.total,
        externalId: paymentIntent.id,
        updatedAt: new Date(),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      publishableKeyHint: 'Use sua STRIPE_PUBLISHABLE_KEY no frontend',
    };
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    let event: import('stripe').Stripe.Event;

    try {
      event = stripeClient.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      throw new ForbiddenError('Assinatura de webhook inválida');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(intent: any) {
    const payment = await prisma.payment.findUnique({
      where: { externalId: intent.id },
      include: { order: true },
    });
    if (!payment || payment.status === 'PAID') return;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', updatedAt: new Date(), rawPayload: intent },
      }),
      prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAYMENT_CONFIRMED' },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: 'PAYMENT_CONFIRMED',
          note: 'Pagamento confirmado via Stripe',
        },
      }),
    ]);
    //Envio de email
  }

  async handlePaymentFailed(intent: any) {
    const payment = await prisma.payment.findUnique({
      where: { externalId: intent.id },
    });
    if (!payment) return;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', rawPayload: intent },
    });
  }
}

export const stripeService = new StripeService();
