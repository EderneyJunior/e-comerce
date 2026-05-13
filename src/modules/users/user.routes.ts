import { Router } from 'express';
import { Role } from '@prisma/client';
import { userController } from './user.controller';
import { authenticate, authorize } from '#shared/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.put('/me', userController.updateMe);
router.put('/me/password', userController.changePassword);

router.get('/me/addresses', userController.listAddresses);
router.post('/me/addresses', userController.addAddress);
router.put('/me/addresses/:id', userController.updateAddress);
router.delete('/me/addresses/:id', userController.deleteAddress);

router.get('/', authorize(Role.ADMIN), userController.listUsers);
router.get('/:id', authorize(Role.ADMIN), userController.getUserById);
router.patch('/:id/status', authorize(Role.ADMIN), userController.toggleUserStatus);

export { router as userRouter };
