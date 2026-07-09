import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { dashboardService } from './dashboard.service';
import { couponAdminService, couponAdminSchema } from './coupon.service';
import { stockService, stockMovementFilterSchema } from './stock.service';

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export class AdminController {
  async getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getSummary();
      res.json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  async listCoupons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await couponAdminService.list(page, limit);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }

  async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = couponAdminSchema.parse(req.body);
      const coupon = await couponAdminService.create(data);
      res.status(201).json({ status: 'success', data: coupon });
    } catch (error) {
      next(error);
    }
  }

  async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = couponAdminSchema.partial().parse(req.body);
      const coupon = await couponAdminService.update(String(req.params.id), data);
      res.json({ status: 'success', data: coupon });
    } catch (error) {
      next(error);
    }
  }

  async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await couponAdminService.delete(String(req.params.id));
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getStockAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await stockService.getLowStockAlerts();
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }

  async getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = stockMovementFilterSchema.parse(req.query);
      const result = await stockService.getMovements(filters);
      res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
