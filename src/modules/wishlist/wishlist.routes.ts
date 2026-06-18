import { Router, Request, Response, NextFunction } from 'express';
import { wishlistService } from './wishlist.service';
import { authenticate } from '#shared/middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = paginationSchema.parse(req.body);
    const { id } = req.user!;
    const result = await wishlistService.list(id, page, limit);
    res.json({ status: 'sucess', ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { id } = req.user!;
    const result = await wishlistService.add(id, String(productId));
    res.status(201).json({ status: 'sucess', ...result });
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { id } = req.user!;
    await wishlistService.remove(id, String(productId));
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export { router as wishlistRoutes };
