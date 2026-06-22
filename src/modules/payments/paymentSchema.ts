import { z } from 'zod';

export const stripeCheckoutSchema = z.object({
  orderId: z.uuid(),
});

export const mercadopagoCheckoutSchema = z.object({
  orderId: z.uuid(),
  method: z.enum(['PIX', 'BOLETO']),
});

export type StripeCheckoutInput = z.infer<typeof stripeCheckoutSchema>;
export type MercadopagoCheckoutInput = z.infer<typeof mercadopagoCheckoutSchema>;
