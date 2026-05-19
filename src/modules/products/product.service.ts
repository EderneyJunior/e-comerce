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
}
