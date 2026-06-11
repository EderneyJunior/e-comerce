import { prisma } from '#config/prisma';
import { NotFoundError, ConflictError } from '#shared/errors/appError';

export class WishlistService {
  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.wishlist.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              basePrice: true,
              discountPrice: true,
              avgRating: true,
              isActive: true,
              images: {
                where: { isCover: true },
                take: 1,
                select: { url: true, altText: true },
              },
              variants: {
                where: { isActive: true },
                select: { stock: true },
              },
            },
          },
        },
      }),
      prisma.wishlist.count({ where: { userId } }),
    ]);

    return {
      data: items.map((item) => ({
        ...item.product,
        addedAt: item.createdAt,
        inStock: item.product.variants.some((variant) => variant.stock > 0),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async add(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true, deletedAt: null },
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictError('Produto já está na lista de favoritos');

    await prisma.wishlist.create({ data: { userId, productId } });
    return { productId, message: 'Adicionado aos favoritos' };
  }

  async remove(userId: string, productId: string) {
    const item = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundError('Produto não encontrado na lista de favoritos');

    await prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
  }
}

export const wishlistService = new WishlistService();
