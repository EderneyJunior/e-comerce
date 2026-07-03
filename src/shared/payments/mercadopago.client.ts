import { MercadoPagoConfig, Payment as MPPayment } from 'mercadopago';
import { env } from '#config/env';

export const mpClient = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN });

export const mpPaymentApi = new MPPayment(mpClient);
