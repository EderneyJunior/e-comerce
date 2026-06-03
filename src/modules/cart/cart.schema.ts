import { z } from 'zod';

export const addItemSchema = z.object({
  variantId: z.uuid('Id de variante inválido'),
  quantity: z
    .number()
    .int()
    .positive('A quantidade deve ser um número inteiro positivo')
    .max(99, 'A quantidade máxima permitida é 99'),
});

export const updateItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive('A quantidade deve ser um número inteiro positivo')
    .max(99, 'A quantidade máxima permitida é 99'),
});

export const margeCartSchema = z.object({
  sessionId: z.string().min(1, 'O sessionId é obrigatório'),
});

export const shippingSchema = z.object({
  zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido. O formato deve ser (00000-000)'),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(50).trim().toUpperCase(),
});

export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type MergeCartInput = z.infer<typeof margeCartSchema>;
export type ShippingInput = z.infer<typeof shippingSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
