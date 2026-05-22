import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { createCategorySchema, UpdateCategorySchema } from './product.schema';

export class CategoryController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.findAll();
      return res.json({ status: 'success', data: categories });
    } catch (error) {
      next(error);
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const category = await categoryService.findBySlug(String(slug));
      return res.json({ status: 'success', data: category });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCategorySchema.parse(req.body);
      const category = await categoryService.create(data);
      return res.status(201).json({ status: 'success', data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = UpdateCategorySchema.parse(req.body);
      const category = await categoryService.update(String(id), data);
      return res.json({ status: 'success', data: category });
    } catch (error) {
      next(error);
    }
  }

  async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await categoryService.delete(String(id));
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
