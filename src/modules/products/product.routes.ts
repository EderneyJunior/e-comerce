import { Router } from 'express';
import { Role } from '@prisma/client';
import { productController } from './product.controller';
import { categoryController } from './category.controller';
import { authorize, authenticate } from '#shared/middlewares/auth.middleware';
import { uploadMiddleware } from '#shared/middlewares/upload.middleware';

const router = Router();

router.get('/categories', categoryController.index);
router.get('/categories/:slug', categoryController.show);

router.post('/admin/categories', authenticate, authorize(Role.ADMIN), categoryController.create);
router.put('/admin/categories/:id', authenticate, authorize(Role.ADMIN), categoryController.update);
router.delete(
  '/admin/categories/:id',
  authenticate,
  authorize(Role.ADMIN),
  categoryController.destroy,
);

router.get('/products', productController.index);
router.get('/products/:slug', productController.show);

const adminProduct = Router();
adminProduct.use(authenticate, authorize(Role.ADMIN));

adminProduct.post('/', productController.create);
adminProduct.put('/:id', productController.update);
adminProduct.patch('/:id/status', productController.toggleStatus);
adminProduct.delete('/:id', productController.destroy);

adminProduct.post('/:id/images', uploadMiddleware.single('image'), productController.uploadImage);
adminProduct.delete('/:productId/images/:imageId', productController.deleteImage);
adminProduct.patch('/:productId/images/:imageId/cover', productController.setCoverImage);

adminProduct.post('/:productId/variants', productController.addVariant);
adminProduct.put('/:productId/variants/:variantId', productController.updateVariant);
adminProduct.patch('/:productId/variants/:variantId/stock', productController.adjustStock);

router.use('/admin/products', adminProduct);

export { router as productRouter };
