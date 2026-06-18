import { Router } from 'express';
import { cartController } from './cart.controller';
import { optionalAuth, authenticate } from '#shared/middlewares/auth.middleware';

const router = Router();
router.get('/', optionalAuth, cartController.getCart);
router.post('/items', optionalAuth, cartController.addItem);
router.put('/items/:itemId', optionalAuth, cartController.updateItem);
router.delete('/items/:itemId', optionalAuth, cartController.removeItem);
router.delete('/', optionalAuth, cartController.clearCart);
router.post('/shipping', optionalAuth, cartController.calculateShipping);

router.post('/merge', authenticate, cartController.mergeCart);
router.post('/coupon', authenticate, cartController.applyCoupon);
router.delete('/coupon', authenticate, cartController.removeCoupon);

export { router as cartRouter };
