import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import {
  createProductSchema,
  updateProductSchema,
  productFilterSchema,
  createVariantSchema,
  updateVariantSchema,
  adjustStockSchema,
} from './product.schema';
import { NotFoundError, UnauthorizedError } from '#shared/errors/appError';

export class ProductController {
  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = productFilterSchema.parse(req.query);
      const result = await productService.findAll(filters);
      return res.json({ status: 'success', ...result });
    } catch (error) {
      next(error);
    }
  }

  async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const product = await productService.findBySlug(String(slug));
      return res.json({ status: 'success', data: product });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await productService.create(data);
      return res.status(201).json({ status: 'success', data: product });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateProductSchema.parse(req.body);
      const product = await productService.update(String(id), data);
      return res.json({ status: 'success', data: product });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const product = await productService.toggleStatus(String(id));
      return res.json({ status: 'success', data: product });
    } catch (error) {
      next(error);
    }
  }

  async destroy(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await productService.softDelete(String(id));
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { file } = req;
      const { id } = req.params;

      if (!file) throw new NotFoundError('Não tem arquivo para upload');

      const image = await productService.uploadImage(String(id), file);
      return res.status(201).json({ status: 'success', data: image });
    } catch (error) {
      next(error);
    }
  }

  async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, imageId } = req.params;
      await productService.deleteImage(String(productId), String(imageId));
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async setCoverImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, imageId } = req.params;
      await productService.setCoverImage(String(productId), String(imageId));
      return res.json({ status: 'success', message: 'Cover image updated' });
    } catch (error) {
      next(error);
    }
  }

  async addVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const data = createVariantSchema.parse(req.body);
      const variant = await productService.addVariant(String(productId), data);
      return res.status(201).json({ status: 'success', data: variant });
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, variantId } = req.params;
      const data = updateVariantSchema.parse(req.body);
      const variant = await productService.updateVariant(
        String(productId),
        String(variantId),
        data,
      );
      return res.json({ status: 'success', data: variant });
    } catch (error) {
      next(error);
    }
  }

  adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, variantId } = req.params;
      const adminId = req.user?.id;
      const data = adjustStockSchema.parse(req.body);
      if (!adminId) throw new UnauthorizedError('Não autorizado');

      const variant = productService.adjustStock(
        String(productId),
        String(variantId),
        adminId,
        data,
      );
      return res.json({ status: 'success', data: variant });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
