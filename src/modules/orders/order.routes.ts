import { Router } from 'express';
import { Role } from '@prisma/client';
import { orderController } from './order.controller';

import { authenticate, authorize } from '#shared/middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', orderController.checkout);
router.get('/', orderController.listMine);
router.get('/:orderId', orderController.show);
router.post('/:orderId/cancel', orderController.cancel);

const adminRouter = Router();
adminRouter.use(authorize(Role.ADMIN));

adminRouter.get('/', orderController.adminlist);
adminRouter.get('/:orderId', orderController.adminshow);
adminRouter.patch('/:orderId/status', orderController.updateStatus);
adminRouter.post('/:orderId/refund', orderController.refund);

export { router as orderRouter, adminRouter as orderAdminRouter };
