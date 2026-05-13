import { Router } from 'express';
import { authController } from './auth.controller';

const router = Router();

/**
 * @openapi
 * /auth/login:
 *  post:
 *      tags: [Auth]
 *      summary: Cadastrar um usuario
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /auth/login:
 *  post:
 *      tags: [Auth]
 *      summary: Fazer login
 */
router.post('/login', authController.login);

router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

export { router as authRouter };
