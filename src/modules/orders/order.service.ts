import { Prisma, OrderStatus } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { prisma } from '#config/prisma';
import { NotFoundError, AppError, ForbiddenError } from '#shared/errors/appError';
import type { CheckoutInput, UpdateOrderStatusInput, OrderFilterInput } from './order.schema';
import { stripeClient } from '#shared/payments/stripe.client';
import { mpPaymentApi } from '#shared/payments/mercadopago.client';
import { emailService } from '#shared/email/email.service';

const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING'];

const VALID_TRANSATIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAYMENT_CONFIRMED', 'CANCELLED'],
  PAYMENT_CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class OrderService {
  async checkout(userId: string, data: CheckoutInput) {
    const address = await prisma.address.findFirst({
      where: { id: data.addressId, userId },
    });
    if (!address) throw new NotFoundError('Endereço não encontrado');

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        coupon: true,
      },
    });
    if (!cart || cart.items.length === 0) throw new AppError('Seu carrinho está vazio', 400);

    for (const item of cart.items) {
      if (!item.variant.isActive || !item.variant.product.isActive) {
        throw new AppError(`O produto "${item.variant.product.name}" não está disponivel`);
      }

      if (item.variant.stock < item.quantity) {
        throw new AppError(
          `Estoque insuficiente para "${item.variant.product.name}" (${item.variant.name}). Disponivel: ${item.variant.stock}`,
        );
      }
    }

    const subtotal = cart.items.reduce((acc, item) => {
      const price = Number(item.variant.price ?? item.variant.product.basePrice);
      return acc + price * item.quantity;
    }, 0);

    let discount = 0;
    if (cart.coupon) {
      if (cart.coupon.discountType === 'PERCENTAGE') {
        discount = (subtotal * Number(cart.coupon.discountValue)) / 100;
      }

      if (cart.coupon.discountType === 'FIXED') {
        discount = Math.min(Number(cart.coupon.discountValue), subtotal);
      }
    }

    const shippingFee = cart.coupon?.discountType === 'FREE_SHIPPING' ? 0 : data.shippingFee;
    const total = Number.parseFloat((subtotal - discount + shippingFee).toFixed(2));

    const order = await prisma.$transaction(async (tx) => {
      const createOrder = await tx.order.create({
        data: {
          userId,
          addressId: data.addressId,
          status: 'PENDING',
          subtotal: Number.parseFloat(subtotal.toFixed(2)),
          discount: Number.parseFloat(discount.toFixed(2)),
          shippingFree: shippingFee,
          total,
          shippingMethod: data.shippingMethod,
          couponId: cart.couponId,
          notes: data.notes,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              productName: item.variant.product.name,
              variantName: item.variant.name,
              sku: item.variant.sku,
              unitPrice: Number(item.variant.price ?? item.variant.product.basePrice),
              quantity: item.quantity,
              subtotal: Number.parseFloat(
                Number(item.variant.price ?? item.variant.product.basePrice).toFixed(2),
              ),
            })),
          },
          statusHistory: { create: { status: 'PENDING', note: 'Pedrido criado' } },
        },
        include: { items: true },
      });

      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'OUT',
            quantity: item.quantity,
            reason: `Reserva do  pedido #${createOrder.id.slice(0, 8)}`,
          },
        });
      }

      if (cart.couponId) {
        await tx.orderCoupon.create({
          data: {
            orderId: createOrder.id,
            couponId: cart.couponId,
            discountAmount: Number.parseFloat(discount.toFixed(2)),
          },
        });

        await tx.coupon.update({
          where: { id: cart.couponId },
          data: {
            usageCount: { increment: 1 },
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

      return createOrder;
    });
    return order;
  }

  async expireUnpairOrders(timeoutMinutes: number): Promise<number> {
    const custoff = addMinutes(new Date(), -timeoutMinutes);

    const expiredOrders = await prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lt: custoff } },
      include: { items: true },
    });

    for (const order of expiredOrders) {
      await this.cancelInternal(order.id, 'pagamento não confirmado', null);
    }

    return expiredOrders.length;
  }

  async listMyOrders(userId: string, filters: OrderFilterInput) {
    const { page, limit, status } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { userId, ...(status && { status }) };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            select: { productName: true, variantName: true, quantity: true, subtotal: true },
          },
          payament: {
            select: { status: true, method: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderById(orderId: string, userId?: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, ...(userId && { userId }) },
      include: {
        items: true,
        address: true,
        payament: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        coupon: { select: { code: true } },
      },
    });

    if (!order) throw new NotFoundError('Produto não encontrado');
    return order;
  }

  async cancelOrder(orderId: string, userId: string, reason: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundError('Pedido não encontrado');

    if (!CANCELLABLE_STATUSES.includes(order.status))
      throw new ForbiddenError(`Pedidoscom status "${order.status} não podem mais ser cancelados"`);

    return this.cancelInternal(orderId, reason ?? 'Cancelado pelo cliente', userId);
  }

  async updateStatus(orderId: string, data: UpdateOrderStatusInput, adminId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Pedido não encontrado');

    const allowed = VALID_TRANSATIONS[order.status];
    if (!allowed.includes(data.status))
      throw new AppError(`Não é possivel mudar de  "${order.status}" para "${data.status}"`, 400);

    if (data.status === 'CANCELLED')
      return this.cancelInternal(orderId, data.note ?? 'Cancelado pelo administrador', adminId);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: data.status },
      });

      await tx.orderStatusHistory.create({
        data: { orderId, status: data.status, node: data.note, changedBy: adminId },
      });

      return updated;
    });

    if (data.status === 'SHIPPED') {
      const orderDetails = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: { select: { name: true, email: true } } },
      });

      if (orderDetails) {
        await emailService.sendOrderShipped(orderDetails.user.email, {
          customerName: orderDetails.user.name,
          orderId: orderDetails.id,
          shippingMethod: orderDetails.shippingMethod ?? 'Padrao',
          trackingCode: data.note ?? undefined,
        });
      }
    }

    return result;
  }

  async listAllOrders(filters: OrderFilterInput) {
    const { limit, page, status } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = status ? { status } : {};

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          payments: {
            select: { status: true, method: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelInternal(orderId: string, reason: string, changedBy: string | null) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Devolução por cancelamento do pedido #${orderId.slice(0, 8)}`,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      await tx.orderStatusHistory.create({
        data: { orderId, status: 'CANCELLED', note: reason, changedBy },
      });

      return updated;
    });
  }

  async refundOrder(orderId: string, adminId: string, reason?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payament: { where: { status: 'PAID' }, orderBy: { createdAt: 'desc' } } },
    });
    if (!order) throw new NotFoundError('Pedido não encontrado');

    const payment = order.payament[0];
    if (!payment)
      throw new AppError('Não é possivel reembolsar um pedido sem pagamento aprovado', 400);

    if (!['PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status)) {
      throw new AppError(`Não é possivel reembolsar um pedido com status "${order.status}"`, 400);
    }

    if (payment.provider === 'STRIPE') {
      await stripeClient.refunds.create({ payment_intent: payment.externalId! });
    }
    if (payment.provider === 'MARCADOPAGO') {
      await mpPaymentApi.create({ id: Number(payment.externalId) } as any);
    }

    return prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', updatedAt: new Date() },
      });

      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'IN',
            quantity: item.quantity,
            reason: `Devolução por reembolso do pedido #${orderId.slice(0, 8)}`,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'REFUNDED',
          note: reason ?? 'Reembolsado pelo administrador',
          changedBy: adminId,
        },
      });

      return updated;
    });
  }
}

export const orderService = new OrderService();
