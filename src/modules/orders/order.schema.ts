import { z } from 'zod';

export const checkoutShema = z.object({
  addressId: z.uuid('Endereço inválido'),
  shippingMethod: z.enum(['STANDARD', 'EXPRESS', 'FREE']).default('STANDARD'),
  shippingFee: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const orderFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z
    .enum([
      'PENDING',
      'PAYMENT_CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ])
    .optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().max(300).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutShema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type OrderFilterInput = z.infer<typeof orderFilterSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
