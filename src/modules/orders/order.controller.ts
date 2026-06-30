import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import {
  cancelOrderSchema,
  checkoutShema,
  orderFilterSchema,
  updateOrderStatusSchema,
} from './order.schema';

export class OrderController {
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = checkoutShema.parse(req.body);
      const order = await orderService.checkout(userId, data);
      res.status(201).json({ status: 'success', data: order });
    } catch (error) {
      next(error);
    }
  }

  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const filters = orderFilterSchema.parse(req.query);
      const result = await orderService.listMyOrders(userId, filters);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const userId = req.user!.id;
      const order = await orderService.getOrderById(String(orderId), userId);
      res.json({ status: 'success', data: order });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { orderId } = req.params;
      const { reason } = cancelOrderSchema.parse(req.body);
      const order = await orderService.cancelOrder(String(orderId), userId, String(reason));
      res.json({ status: 'success', data: order });
    } catch (error) {
      next(error);
    }
  }

  async adminlist(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = orderFilterSchema.parse(req.query);
      const result = await orderService.listAllOrders(filters);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }

  async adminshow(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrderById(String(orderId));
      res.json({ status: 'success', data: order });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = updateOrderStatusSchema.parse(req.body);
      const { orderId } = req.params;
      const order = await orderService.updateStatus(String(orderId), data, userId);
      res.json({ status: 'success', data: order });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();
