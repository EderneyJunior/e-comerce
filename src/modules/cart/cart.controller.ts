import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { calculateShipping } from './shipping.service';
import {
  addItemSchema,
  updateItemSchema,
  couponSchema,
  margeCartSchema,
  shippingSchema,
} from './cart.schema';
import { env } from '#config/env';
import { AppError } from '#shared/errors/appError';

function getSessionId(req: Request): string | undefined {
  return req.headers[env.CART_SESSION_HEADER] as string | undefined;
}

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const cart = await cartService.getCart(userId, getSessionId(req));
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { variantId, quantity } = addItemSchema.parse(req.body);
      const cart = await cartService.addItem(variantId, quantity, userId, getSessionId(req));
      res.status(201).json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { quantity } = updateItemSchema.parse(req.body);
      const cart = await cartService.updateItem(
        String(itemId),
        quantity,
        userId,
        getSessionId(req),
      );
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const cart = await cartService.removeItem(String(itemId), userId, getSessionId(req));
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      await cartService.clearCart(userId, getSessionId(req));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async mergeCart(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { sessionId } = margeCartSchema.parse(req.body);
      if (!userId) throw new AppError('Usuario não autenticado', 401);
      const cart = await cartService.mergeCart(userId, sessionId);
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async calculateShipping(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { zipCode } = shippingSchema.parse(req.query);
      const cart = await cartService.getCart(userId, getSessionId(req));

      const totalWeight = (cart as any).items.reduce(
        (acc: number, item: any) => acc + (item.variant?.weight ?? 0.3) * item.quantity,
      );
      const subTotal = (cart as any).totals?.subTotal ?? 0;
      const options = await calculateShipping(zipCode, totalWeight, subTotal);

      res.json({ status: 'success', data: options });
    } catch (error) {
      next(error);
    }
  }

  async applyCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { code } = couponSchema.parse(req.body);
      if (!userId) throw new AppError('Usuario não autenticado', 401);

      const cart = await cartService.applyCoupon(code, userId);
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }

  async removeCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) throw new AppError('Usuario não autenticado', 401);
      const cart = await cartService.removeCoupon(req.user.id);
      res.json({ status: 'success', data: cart });
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();
