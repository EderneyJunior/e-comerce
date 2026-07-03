import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '#shared/middlewares/auth.middleware';

const router = Router();

router.post('/stripe', paymentController.stripeWebhook);
router.post('/mercadopago', paymentController.mercadoPagoWebhook);

router.use(authenticate);

router.post('/stripe/checkout', paymentController.stripeCheckout);
router.post('/mercadopago/checkout', paymentController.mercadoPagoCheckout);

export { router as paymentRouter };
