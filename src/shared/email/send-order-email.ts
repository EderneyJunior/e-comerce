import { prisma } from '#config/prisma';
import { emailService } from './email.service';

export async function sendOrderConfirmedEmail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, email: true } },
      items: true,
      address: true,
    },
  });

  if (!order) return;

  await emailService.sendOrderConfirmed(order.user.email, {
    customerName: order.user.name,
    orderId: order.id,
    items: order.items.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shippingFree),
    total: Number(order.total),
    address: order.address,
  });
}
