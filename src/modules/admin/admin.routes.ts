import { Router } from 'express';
import { Role } from '@prisma/client';
import { adminController } from './admin.controller';
import { authenticate, authorize } from '#shared/middlewares/auth.middleware';

const router = Router();
router.use(authenticate, authorize(Role.ADMIN));

router.get('/dashboard', adminController.getDashboard);

router.get('/coupons', adminController.listCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

router.get('/stock/alerts', adminController.getStockAlerts);
router.get('/stock/movements', adminController.getStockMovements);

export { router as adminRouter };
