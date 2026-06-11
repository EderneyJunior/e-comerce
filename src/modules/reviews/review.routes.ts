import { Router, Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';
import { authenticate } from '#shared/middlewares/auth.middleware';
import { z } from 'zod';

const router = Router();

const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  body: z.string().min(2000).optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
});

router.get('/products/:slug/reviews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const { page, limit } = paginationSchema.parse(req.query);
    const review = await reviewService.list(String(slug), page, limit);
    res.json({ status: 'success', data: review });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/products/:slug/reviews',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;
      const { id } = req.user!;
      const data = createReviewSchema.parse(req.body);
      const review = await reviewService.create(String(slug), id, data);
      res.status(204).json({ status: 'success', data: review });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/reviews/:reviewId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { id } = req.user!;
      const data = createReviewSchema.partial().parse(req.body);
      const review = await reviewService.update(id, String(reviewId), data);
      res.json({ status: 'success', data: review });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/review/:reviewId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { id } = req.user!;
      await reviewService.delete(id, String(reviewId));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/reviews/:id/helpful',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.params;
      const { id } = req.user!;
      const result = await reviewService.markHelpful(id, String(reviewId));
      res.json({ status: 'success', data: result });
    } catch (error) {
      next(error);
    }
  },
);

export { router as reviewRoutes };
