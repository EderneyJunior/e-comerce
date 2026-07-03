import { Request, Response, NextFunction } from 'express';
import { stripeService } from './stripe.service';
import { mercadopagoService } from './mercadopago.service';
import { stripeCheckoutSchema, mercadopagoCheckoutSchema } from './paymentSchema';

export class PaymentController {
  async stripeCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { orderId } = stripeCheckoutSchema.parse(req.body);
      const result = await stripeService.createCheckout(orderId, userId);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async mercadoPagoCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { orderId, method } = mercadopagoCheckoutSchema.parse(req.body);
      const result = await mercadopagoService.createCheckout(orderId, userId, method);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async stripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = String(req.headers['stripe-signature'] ?? '');
      const result = await stripeService.handleWebhookEvent(req.body, signature);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async mercadoPagoWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, data } = req.body;
      let result;

      if (type === 'payment') {
        result = await mercadopagoService.handleWebhookNotification(String(data.id));
      } else {
        result = { received: true };
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
