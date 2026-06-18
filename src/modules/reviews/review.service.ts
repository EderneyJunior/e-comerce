import { prisma } from '#config/prisma';
import { NotFoundError, ConflictError, AppError } from '#shared/errors/appError';

interface CreateReviewInput {
  rating: number;
  title?: string;
  body?: string;
}

export class ReviewService {
  async list(productSlug: string, page = 1, limit = 10) {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug, isActive: true, deletedAt: null },
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const skip = (page - 1) * limit;
    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where: { productId: product.id },
        skip,
        take: limit,
        orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.review.count({ where: { productId: product.id } }),
    ]);

    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId: product.id },
      _count: { rating: true },
    });

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      status: {
        avgRating: product.avgRating,
        reviewCount: product.reviewCount,
        distribution: distribution.reduce(
          (acc, r) => ({ ...acc, [r.rating]: r._count.rating }),
          {} as Record<number, number>,
        ),
      },
    };
  }

  async create(productSlug: string, userId: string, input: CreateReviewInput) {
    const product = await prisma.product.findUnique({
      where: { slug: productSlug, isActive: true, deletedAt: null },
    });
    if (!product) throw new NotFoundError('Produto não encontrado');

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId, productId: product.id } },
    });
    if (existing) throw new ConflictError('Usuário já avaliou este produto');

    const verified = await prisma.orderItem
      ?.findFirst({
        where: {
          order: { userId, status: { in: ['DELIVERED', 'SHIPPED'] } },
          variant: { productId: product.id },
        },
      } as any)
      .catch(() => null);

    const review = await prisma.review.create({
      data: {
        userId,
        productId: product.id,
        rating: input.rating,
        title: input.title,
        body: input.body,
        isVerified: !verified,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    await this.recalculateRating(product.id);

    return review;
  }

  async update(userId: string, reviewId: string, data: Partial<CreateReviewInput>) {
    const review = await prisma.review.findFirst({
      where: { reviewId, userId },
    });
    if (!review) throw new NotFoundError('Avaliação não encontrada');

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    if (data.rating !== undefined) {
      await this.recalculateRating(review.productId);
    }

    return updated;
  }

  async delete(userId: string, reviewId: string) {
    const review = await prisma.review.findFirst({
      where: { userId, id: reviewId },
    });
    if (!review) throw new NotFoundError('Avaliação não encontrada');

    await prisma.review.delete({ where: { id: reviewId } });
    await this.recalculateRating(review.productId);
  }

  async markHelpful(userId: string, reviewId: string) {
    const review = await prisma.review.findFirst({
      where: { userId, id: reviewId },
    });
    if (!review) throw new NotFoundError('Avaliação não encontrada');

    if (review.userId === userId)
      throw new AppError('Voçê não pode marcar sua propria avaliação como util', 400);

    const existing = await prisma.reviewHelpful.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });
    if (existing) {
      await prisma.$transaction([
        prisma.reviewHelpful.delete({ where: { userId_reviewId: { userId, reviewId } } }),
        prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } }),
      ]);
      return { helpful: false };
    }

    await prisma.$transaction([
      prisma.reviewHelpful.create({ data: { userId, reviewId } }),
      prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
    ]);
    return { helpful: true };
  }

  private async recalculateRating(productId: string) {
    const result = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: Number.parseFloat((result._avg.rating ?? 0).toFixed(2)),
        reviewCount: result._count.rating,
      },
    });
  }
}

export const reviewService = new ReviewService();
