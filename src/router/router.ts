import { Router, Request, Response } from 'express';
import { authRouter } from '#modules/auth/auth.routes';
import { userRouter } from '#modules/users/user.routes';
import swaggerui from 'swagger-ui-express';
import { swaggerSpec } from '#config/swagger.js';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'pong' });
});

router.use('/api/v1/auth', authRouter);
router.use('/api/v1/users', userRouter);

router.use('/api/docs', swaggerui.serve, swaggerui.setup(swaggerSpec));

export default router;
