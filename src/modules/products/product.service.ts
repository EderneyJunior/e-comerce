import { Prisma } from '@prisma/client';
import { prisma } from '#config/prisma';
import { NotFoundError, ConflictError, AppError } from '#shared/errors/appError';
import { uniqueProductSlug } from '#shared/utils/slug';
import { storageService } from '#shared/storage';
import type {
  CreateProductInput,
  UpdateProductInput,
  CreateVariantInput,
  UpdateVariantInput,
  AdjustStockInput,
  ProductFilterInput,
} from './product.schema';

const productListSelect = {
  id: true,
  name: true,
  slug: true,
  basePrice: true,
  discountPrice: true,
  brand: true,
  avgRating: true,
  reviewCount: true,
  isFeatured: true,
  isActive: true,
  createdAt: true,
  images: {
    where: { isCover: true },
    take: 1,
    select: { url: true, altText: true },
  },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true } } },
  },
  variants: {
    where: { isActive: true },
    select: { id: true, name: true, price: true, stock: true, sku: true },
  },
} satisfies Prisma.ProductSelect;

export class ProductService {
  async findAll(filters: ProductFilterInput) {
    const {
      page,
      limit,
      search,
      categorySlug,
      minPrice,
      maxPrice,
      brand,
      inStock,
      isFeatured,
      sortBy,
      sortOrder,
    } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
      ...(isFeatured !== undefined && { isFeatured }),
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            basePrice: {
              ...(minPrice !== undefined && { gte: minPrice }),
              ...(maxPrice !== undefined && { lte: maxPrice }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(categorySlug && {
        categories: {
          some: {
            category: {
              OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }],
            },
          },
        },
      }),
      ...(inStock !== undefined && {
        variants: { some: { stock: { gt: 0 }, isActive: true } },
      }),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        orderBy: { [sortBy]: sortOrder },
        select: productListSelect,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async findBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug, isActive: true, deletedAt: null },
      include: {
        images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }] },
        variants: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        attributes: true,
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!product) throw new NotFoundError('Produto não encontrado');
    return product;
  }

  async create(data: CreateProductInput) {
    const { categoryIds, attributes, ...productData } = data;

    if (productData.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });
      if (existing) throw new ConflictError('SKU já existe');
    }

    const slug = await uniqueProductSlug(productData.name);

    const product = await prisma.product.create({
      data: {
        ...productData,
        slug,
        categories: {
          create: categoryIds.map((categoryId) => ({ categoryId })),
        },
        attributes: {
          create: attributes,
        },
      },
      include: {
        categories: { include: { category: true } },
        attributes: true,
        images: true,
        variants: true,
      },
    });
    return product;
  }

  async update(id: string, data: UpdateProductInput) {
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) throw new NotFoundError('Produto não encontrado');

    const { categoryIds, attributes, ...productData } = data;

    const slug = productData.name ? await uniqueProductSlug(productData.name, id) : product.slug;

    return await prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ categoryId, productId: id })),
        });
      }

      if (attributes) {
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        await tx.productAttribute.createMany({
          data: attributes?.map((a) => ({ ...a, productId: id })),
        });
      }

      return await tx.product.update({
        where: { id },
        data: { ...productData, slug },
        include: {
          categories: { include: { category: true } },
          attributes: true,
          images: true,
          variants: true,
        },
      });
    });
  }

  async toggleStatus(id: string) {
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundError('Produto não encontrado');
    return await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }

  async softDelete(id: string) {
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundError('Produto não encontrado');
    return await prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async uploadImage(productId: string, file: Express.Multer.File) {
    const product = await prisma.product.findFirst({ where: { productId, deletedAt: null } });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const imageCount = await prisma.productImage.count({ where: { productId } });
    if (imageCount >= 10) throw new AppError('Limite de 10 imagens por produto', 400);

    const { url } = await storageService.upload(file, 'products');

    const isCover = imageCount === 0;

    return await prisma.productImage.create({
      data: {
        productId,
        url,
        altText: file.originalname.replace(/\.[^/.]+$/, ''),
        isCover,
        sortOrder: imageCount,
      },
    });
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundError('Imagem não encontrada');

    const key = image.url.split('/uploads/')[1] ?? image.url.split('.amazonaws.com/')[1];
    if (key) await storageService.delete(key).catch(() => {});

    await prisma.productImage.delete({ where: { id: imageId } });

    if (image.isCover) {
      const next = await prisma.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });

      if (next) {
        await prisma.productImage.update({
          where: { id: next.id },
          data: { isCover: true },
        });
      }
    }
  }

  async setCoverImage(productId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundError('Imagem não encontrada');

    await prisma.$transaction([
      prisma.productImage.updateMany({ where: { productId }, data: { isCover: false } }),
      prisma.productImage.update({ where: { id: imageId }, data: { isCover: true } }),
    ]);
  }

  async addVariant(productId: string, data: CreateVariantInput) {
    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const existing = await prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });
    if (existing) throw new ConflictError(`SKU ${data.sku} já esta em uso`);

    const variant = await prisma.productVariant.create({
      data: { ...data, productId },
    });

    if (data.stock > 0) {
      await prisma.stockMovement.create({
        data: {
          variantId: variant.id,
          type: 'IN',
          quantity: data.stock,
          reason: 'Estoque inicial',
        },
      });
    }
    return variant;
  }

  async updateVariant(productId: string, variantId: string, data: UpdateVariantInput) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundError('Variante não encontrada');

    if (data.sku && data.sku !== variant.sku) {
      const existing = await prisma.productVariant.findUnique({
        where: { sku: data.sku },
      });
      if (existing) throw new ConflictError(`SKU ${data.sku} já esta em uso`);
    }

    return await prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  async adjustStock(variantId: string, productId: string, adminId: string, data: AdjustStockInput) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundError('Variante não encontrada');

    let newStock: number;

    if (data.type === 'IN') {
      newStock = variant.stock + data.quantity;
    } else if (data.type === 'OUT') {
      newStock = variant.stock - data.quantity;
      if (newStock < 0) throw new AppError('Estoque insuficiente', 400);
    } else {
      newStock = data.quantity;
    }

    const [updatedVariant] = await prisma.$transaction([
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          variantId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          createdBy: adminId,
        },
      }),
    ]);

    if (newStock <= variant.stockMin && newStock > 0) {
      // Disparar notificação de estoque baixo
    }

    return updatedVariant;
  }
}

export const productService = new ProductService();
