import { Prisma, OrderStatus } from '@prisma/client';
import { addMinutes } from 'date-fns';
import { prisma } from '#config/prisma';
import { NotFoundError, AppError, ForbiddenError } from '#shared/errors/appError';
import type { CheckoutInput, UpdateOrderStatusInput, OrderFilterInput } from './order.schema';

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
          shippingFee,
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
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        coupon: { select: { code: true } },
      },
    });

    if (!order) throw new NotFoundError('Produto não encontrado');
    return order;
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
            reason: `Devolução pro cancelamento do pedido #${orderId.slice(0, 8)}`,
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
}
